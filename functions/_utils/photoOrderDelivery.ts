/// <reference types="@cloudflare/workers-types" />
import { EmailEnv, sendEmail } from "./email";
import { diasDeDownload } from "./photoOrders";

/**
 * O que acontece quando o PIX das fotos é confirmado.
 *
 * Mora fora de webhooks.ts porque o webhook já é um arquivo comprido com quatro
 * "finders", e porque marcar como pago e avisar o comprador é o mesmo assunto.
 */

interface Env extends EmailEnv {
  DB: D1Database;
  SITE_URL?: string;
  PHOTO_DOWNLOAD_DAYS?: string;
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

  // O token em claro não existe no banco (só o hash), então o e-mail não pode
  // conter o link direto: ele leva a pessoa de volta à mesma página do pedido,
  // que ela abriu ao pagar e onde o endereço já carrega o segredo.
  const site = (env.SITE_URL || "https://caminhodoperdao.com.br").replace(/\/$/, "");
  const quantidade = pedido.photo_count;
  const plural = quantidade === 1 ? "1 foto" : `${quantidade} fotos`;

  const enviado = await sendEmail(env, {
    to: pedido.email,
    subject: `Pagamento confirmado — suas ${plural} da Caminhada do Perdão`,
    bodyHtml: `
      <p>Olá, ${escaparHtml(pedido.customer_name)}!</p>
      <p>Recebemos seu PIX. Suas <strong>${plural}</strong> já estão liberadas para download,
      em alta resolução e sem marca d'água.</p>
      <p>Volte à página do pedido — a mesma que ficou aberta quando você pagou — e clique em
      cada foto para baixar. Os links valem até
      <strong>${vencimento.toLocaleDateString("pt-BR")}</strong>.</p>
      <p>Perdeu o endereço da página? Chame a organização pelo WhatsApp que reabrimos seu pedido.</p>
      <p>O valor das fotos vira melhoria na estrutura da Caminhada. Obrigado por apoiar.</p>
      <p><a href="${site}/gallery">Ver a galeria</a></p>
    `,
    bodyText: [
      `Olá, ${pedido.customer_name}!`,
      "",
      `Recebemos seu PIX. Suas ${plural} já estão liberadas para download, em alta resolução e sem marca d'água.`,
      "",
      `Volte à página do pedido (a mesma que ficou aberta quando você pagou) e clique em cada foto para baixar. Os links valem até ${vencimento.toLocaleDateString("pt-BR")}.`,
      "",
      "Perdeu o endereço da página? Chame a organização pelo WhatsApp que reabrimos seu pedido.",
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
