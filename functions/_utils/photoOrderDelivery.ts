/// <reference types="@cloudflare/workers-types" />
import { EmailEnv, sendEmail } from "./email";
import { diasDeDownload } from "./photoOrders";

/**
 * Os dois e-mails do pedido de fotos: o que abre o pedido e o que confirma o
 * pagamento.
 *
 * Mora fora de webhooks.ts porque o webhook já é um arquivo comprido com quatro
 * "finders", e porque marcar como pago e avisar o comprador é o mesmo assunto.
 */

interface Env extends EmailEnv {
  DB: D1Database;
  SITE_URL?: string;
  PHOTO_DOWNLOAD_DAYS?: string;
}

const SITE_PADRAO = "https://caminhodoperdao.com.br";

function siteBase(env: { SITE_URL?: string }): string {
  return (env.SITE_URL || SITE_PADRAO).replace(/\/$/, "");
}

/**
 * Formatação à mão, e não `toLocaleString("pt-BR")`: o Intl separa "R$" do
 * número com espaço não-separável (U+00A0), que vira caractere estranho em
 * cliente de e-mail antigo — e o resultado ainda muda conforme o runtime.
 */
function formatarReais(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const resto = String(centavos % 100).padStart(2, "0");
  return `R$ ${reais.toLocaleString("pt-BR")},${resto}`;
}

function plural(quantidade: number): string {
  return quantidade === 1 ? "1 foto" : `${quantidade} fotos`;
}

export interface PedidoAberto {
  nome: string;
  email: string;
  /** Token EM CLARO. Só existe no instante em que o pedido é criado. */
  token: string;
  quantidade: number;
  valorTotalCentavos: number;
  qrCodeText: string;
}

/**
 * Monta o e-mail de pedido aberto. Separado do envio para o teste conferir o
 * que importa aqui: que o link com o token realmente sai no corpo.
 */
export function montarEmailDoPedidoAberto(
  env: { SITE_URL?: string },
  pedido: PedidoAberto
): { subject: string; bodyHtml: string; bodyText: string } {
  const link = `${siteBase(env)}/gallery/pedido?t=${encodeURIComponent(pedido.token)}`;
  const quantas = plural(pedido.quantidade);
  const valor = formatarReais(pedido.valorTotalCentavos);

  return {
    subject: `Seu pedido de ${quantas} — Caminhada do Perdão`,
    bodyHtml: `
      <p>Olá, ${escaparHtml(pedido.nome)}!</p>
      <p>Separamos suas <strong>${quantas}</strong>, no total de <strong>${valor}</strong>.
      Falta só o PIX.</p>
      <p><a href="${link}">Abrir a página do pedido</a> — é lá que fica o QR Code e,
      assim que o pagamento cair, os downloads em alta resolução.</p>
      <p>Guarde este e-mail: <strong>este link é a chave do seu pedido</strong>. Se fechar a
      página, volte por aqui. Não repasse o endereço para ninguém, porque quem tiver ele
      baixa as suas fotos.</p>
      <p>Prefere copiar e colar o PIX no aplicativo do banco?</p>
      <p style="word-break:break-all;font-family:monospace;font-size:13px;background:#f5f3ef;padding:12px;border-radius:8px;">
        ${escaparHtml(pedido.qrCodeText)}
      </p>
    `,
    bodyText: [
      `Olá, ${pedido.nome}!`,
      "",
      `Separamos suas ${quantas}, no total de ${valor}. Falta só o PIX.`,
      "",
      "Abra a página do pedido — é lá que fica o QR Code e, assim que o pagamento cair, os downloads em alta resolução:",
      link,
      "",
      "Guarde este e-mail: este link é a chave do seu pedido. Se fechar a página, volte por aqui. Não repasse o endereço para ninguém, porque quem tiver ele baixa as suas fotos.",
      "",
      "PIX copia e cola:",
      pedido.qrCodeText,
    ].join("\n"),
  };
}

/**
 * Avisa o comprador assim que o pedido é criado, ANTES do pagamento.
 *
 * É o único momento em que o token existe em claro — no banco só fica o hash.
 * Sem este e-mail, quem fecha a aba perde o pedido: não há como reemitir o link
 * a partir do banco.
 */
export async function enviarEmailDoPedidoAberto(
  env: Env,
  pedido: PedidoAberto
): Promise<void> {
  const { subject, bodyHtml, bodyText } = montarEmailDoPedidoAberto(env, pedido);
  await sendEmail(env, { to: pedido.email, subject, bodyHtml, bodyText });
}

export interface PhotoOrderMatch {
  id: string;
  customer_name: string;
  email: string;
  photo_count: number;
  status: string;
}

/** Acha o pedido de fotos a partir das referências que a Woovi manda. */
export async function findPhotoOrderByPaymentRefs(
  db: D1Database,
  paymentRefs: string[]
): Promise<PhotoOrderMatch | null> {
  try {
    for (const ref of paymentRefs) {
      const pedido = await db
        .prepare(
          `SELECT id, customer_name, email, photo_count, status
             FROM photo_order
            WHERE payment_ref = ?1 OR correlation_id = ?1 OR provider_charge_id = ?1
            ORDER BY datetime(created_at) DESC
            LIMIT 1`
        )
        .bind(ref)
        .first<PhotoOrderMatch>();

      if (pedido) return pedido;
    }
  } catch (erro) {
    console.warn("Busca de pedido de fotos no webhook falhou:", erro);
  }

  return null;
}

/**
 * Marca o pedido como pago, define o prazo dos links e avisa o comprador.
 *
 * ⚠️ O UPDATE só pega pedido que ainda está PENDING. A Woovi pode repetir o
 * mesmo webhook, e sem essa condição o prazo de download seria empurrado para
 * frente a cada repetição e o comprador receberia o e-mail várias vezes.
 */
export async function confirmarPedidoDeFotos(
  env: Env,
  pedido: PhotoOrderMatch
): Promise<void> {
  const agora = new Date();
  const vencimento = new Date(agora.getTime() + diasDeDownload(env) * 24 * 60 * 60 * 1000);

  const resultado = await env.DB.prepare(
    `UPDATE photo_order
        SET status = 'PAID', paid_at = ?1, updated_at = ?1, downloads_expire_at = ?2
      WHERE id = ?3 AND status = 'PENDING'`
  )
    .bind(agora.toISOString(), vencimento.toISOString(), pedido.id)
    .run();

  if (!resultado.meta.changes) {
    console.log(`Pedido de fotos ${pedido.id} já estava confirmado; webhook repetido.`);
    return;
  }

  // O token em claro não existe no banco (só o hash), então este e-mail não pode
  // conter o link direto. Quem aponta para a página do pedido é o e-mail de
  // "pedido aberto", disparado na criação — por isso o texto manda procurar por
  // ele, e não "a aba que ficou aberta", que a pessoa provavelmente já fechou.
  const site = siteBase(env);
  const quantas = plural(pedido.photo_count);

  const enviado = await sendEmail(env, {
    to: pedido.email,
    subject: `Pagamento confirmado — suas ${quantas} da Caminhada do Perdão`,
    bodyHtml: `
      <p>Olá, ${escaparHtml(pedido.customer_name)}!</p>
      <p>Recebemos seu PIX. Suas <strong>${quantas}</strong> já estão liberadas para download,
      em alta resolução e sem marca d'água.</p>
      <p>Abra a página do pedido e clique em cada foto para baixar. O endereço dela está no
      e-mail <em>"Seu pedido de ${quantas}"</em>, que enviamos quando você começou a compra —
      é o mesmo link de antes. Os downloads valem até
      <strong>${vencimento.toLocaleDateString("pt-BR")}</strong>.</p>
      <p>Não achou aquele e-mail? Chame a organização pelo WhatsApp que reabrimos seu pedido.</p>
      <p>O valor das fotos vira melhoria na estrutura da Caminhada. Obrigado por apoiar.</p>
      <p><a href="${site}/gallery">Ver a galeria</a></p>
    `,
    bodyText: [
      `Olá, ${pedido.customer_name}!`,
      "",
      `Recebemos seu PIX. Suas ${quantas} já estão liberadas para download, em alta resolução e sem marca d'água.`,
      "",
      `Abra a página do pedido e clique em cada foto para baixar. O endereço dela está no e-mail "Seu pedido de ${quantas}", que enviamos quando você começou a compra — é o mesmo link de antes. Os downloads valem até ${vencimento.toLocaleDateString("pt-BR")}.`,
      "",
      "Não achou aquele e-mail? Chame a organização pelo WhatsApp que reabrimos seu pedido.",
      "",
      "O valor das fotos vira melhoria na estrutura da Caminhada. Obrigado por apoiar.",
      "",
      `${site}/gallery`,
    ].join("\n"),
  });

  if (enviado.sent) {
    await env.DB.prepare("UPDATE photo_order SET delivery_email_sent_at = ?1 WHERE id = ?2")
      .bind(agora.toISOString(), pedido.id)
      .run();
  }
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
