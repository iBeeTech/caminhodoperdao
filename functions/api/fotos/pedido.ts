/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, notFound, serverError } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import { getPaymentProvider } from "../../_utils/payment";
import {
  GalleryManifest,
  isValidYear,
  manifestKey,
  originalKey,
  vendaAberta,
} from "../../_utils/photoGallery";
import { EmailEnv } from "../../_utils/email";
import { enviarEmailDoPedidoAberto } from "../../_utils/photoOrderDelivery";
import {
  MAX_FOTOS_POR_PEDIDO,
  PhotoOrderEnv,
  diasDeDownload,
  fotosDoPedido,
  gerarTokenDoPedido,
  hashTokenDoPedido,
  normalizarFotos,
  pedidoPorToken,
  podeBaixar,
  precoUnitarioCentavos,
} from "../../_utils/photoOrders";

interface Env extends PhotoOrderEnv, EmailEnv {
  WOOVI_APP_ID?: string;
  REGISTRATION_COST?: string;
  SITE_URL?: string;
  PHOTO_SALE_UNTIL?: string;
}

/**
 * POST /api/fotos/pedido — abre o pedido e devolve o QR Code do PIX.
 *
 * UMA cobrança para o carrinho inteiro, não uma por foto: quem escolhe doze
 * fotos pagaria doze PIX, e bastaria um deles falhar para o pedido ficar pela
 * metade. O valor total é calculado AQUI a partir do preço configurado — o que
 * a tela mandar como total é ignorado, senão dava para comprar 40 fotos por R$ 5
 * mexendo na requisição.
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  let corpo: Record<string, unknown>;
  try {
    corpo = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const nome = String(corpo.nome ?? "").trim().replace(/\s+/g, " ");
  const email = String(corpo.email ?? "").trim().toLowerCase();
  const ano = String(corpo.ano ?? "");

  if (nome.length < 2) return badRequest("invalid_name");
  if (!isValidEmail(email)) return badRequest("invalid_email");
  if (!isValidYear(ano)) return badRequest("invalid_year");

  const fotos = normalizarFotos(corpo.fotos);
  if (!fotos) return badRequest("invalid_photos");

  // ⚠️ O prazo é conferido AQUI, e não só na tela. Depois de 31/08 a tela deixa
  // de mostrar o carrinho, mas uma requisição montada à mão ainda geraria PIX de
  // um produto que a organização já anunciou como encerrado.
  if (!vendaAberta(context.env)) {
    return json(410, {
      error: "sale_closed",
      message: "O prazo de compra das fotos em alta terminou. O álbum segue aberto em baixa resolução.",
    });
  }

  // Álbum gratuito (2025) não vende: não existe arquivo em alta guardado para
  // entregar, e cobrar por ele seria vender o que não se tem.
  const manifesto = await context.env.PHOTOS.get(manifestKey(Number(ano)));
  const albumVende = manifesto ? (await manifesto.json<GalleryManifest>()).venda !== false : false;
  if (!albumVende) {
    return json(409, { error: "album_not_for_sale", message: "Este álbum é gratuito." });
  }

  // As fotos precisam existir no balde. Sem esta checagem, um nome inventado
  // entraria no pedido e o comprador pagaria por um arquivo que não vem.
  // Em paralelo, e não uma a uma: com 300 fotos no carrinho, esperar cada
  // consulta em fila deixaria a pessoa olhando o botão travado.
  const presencas = await Promise.all(
    fotos.map(async foto => ({ foto, existe: Boolean(await context.env.PHOTOS.head(originalKey(Number(ano), foto))) }))
  );
  const faltando = presencas.filter(item => !item.existe).map(item => item.foto);
  if (faltando.length) {
    return json(409, { error: "photos_not_found", fotos: faltando.slice(0, 10) });
  }

  const precoUnitario = precoUnitarioCentavos(context.env);
  const total = precoUnitario * fotos.length;

  let cobranca;
  try {
    const provider = getPaymentProvider(context.env);
    cobranca = await provider.createCharge({
      name: nome,
      email,
      amountCents: total,
      comment: `Fotos da Caminhada do Perdão ${ano} (${fotos.length} foto(s))`,
      additionalInfo: [
        { key: "produto", value: `Fotos da Caminhada ${ano}` },
        { key: "quantidade", value: String(fotos.length) },
      ],
    });
  } catch (erro: unknown) {
    console.error("Falha ao criar cobrança das fotos:", erro);
    return serverError("pix_creation_failed");
  }

  const pedidoId = crypto.randomUUID();
  const token = gerarTokenDoPedido();
  const agora = new Date().toISOString();

  try {
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO photo_order (
           id, customer_name, email, event_year, photo_count, unit_price_cents,
           amount_cents, status, payment_provider, payment_ref, correlation_id,
           provider_charge_id, qr_code_text, qr_code_image, access_token_hash,
           created_at, updated_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'PENDING', 'woovi', ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14)`
      ).bind(
        pedidoId,
        nome,
        email,
        Number(ano),
        fotos.length,
        precoUnitario,
        total,
        cobranca.payment_ref,
        cobranca.correlation_id ?? null,
        cobranca.provider_charge_id ?? cobranca.payment_ref,
        cobranca.qrCodeText,
        cobranca.qrCodeImageUrl ?? null,
        await hashTokenDoPedido(token),
        agora
      ),
      ...fotos.map(foto =>
        context.env.DB.prepare(
          "INSERT INTO photo_order_item (order_id, photo_name) VALUES (?1, ?2)"
        ).bind(pedidoId, foto)
      ),
    ]);
  } catch (erro: unknown) {
    console.error("Falha ao gravar pedido de fotos:", erro);
    return serverError("order_persistence_failed");
  }

  // O link com o token vai por e-mail agora, e não depois: no banco só existe o
  // hash, então este é o último instante em que dá para mandar o endereço do
  // pedido para o comprador. Sem isto, fechar a aba antes de pagar significa
  // perder o pedido — nem o admin consegue reemitir o link.
  //
  // waitUntil: o Resend leva centenas de milissegundos e ninguém deve esperar
  // pelo e-mail para ver o QR Code. Falha de envio não derruba o pedido (a tela
  // já está com o link na URL); `sendEmail` só registra no log.
  context.waitUntil(
    enviarEmailDoPedidoAberto(context.env, {
      nome,
      email,
      token,
      quantidade: fotos.length,
      valorTotalCentavos: total,
      qrCodeText: cobranca.qrCodeText,
    })
  );

  return json(200, {
    status: "PENDING",
    // O token só aparece aqui e vai para a URL da tela do pedido. Quem tiver
    // este endereço acompanha o pagamento e baixa as fotos depois.
    token,
    pedido_id: pedidoId,
    quantidade: fotos.length,
    valor_unitario_centavos: precoUnitario,
    valor_total_centavos: total,
    qrCodeText: cobranca.qrCodeText,
    qrCodeImageUrl: cobranca.qrCodeImageUrl ?? null,
  });
};

/**
 * GET /api/fotos/pedido?t=<token> — estado do pedido.
 *
 * É o que a tela consulta de tempos em tempos enquanto o PIX não cai: o webhook
 * da Woovi marca PAID e a próxima consulta já vem com as fotos liberadas.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const token = new URL(context.request.url).searchParams.get("t") ?? "";
  const pedido = await pedidoPorToken(context.env.DB, token);
  if (!pedido) return notFound("order_not_found");

  const liberado = podeBaixar(pedido);
  const fotos = await fotosDoPedido(context.env.DB, pedido.id);

  return json(200, {
    status: pedido.status,
    nome: pedido.customer_name,
    email: pedido.email,
    ano: pedido.event_year,
    quantidade: pedido.photo_count,
    valor_total_centavos: pedido.amount_cents,
    qrCodeText: pedido.status === "PENDING" ? pedido.qr_code_text : null,
    qrCodeImageUrl: pedido.status === "PENDING" ? pedido.qr_code_image : null,
    baixavel: liberado,
    downloads_expiram_em: pedido.downloads_expire_at,
    dias_de_download: diasDeDownload(context.env),
    limite_por_pedido: MAX_FOTOS_POR_PEDIDO,
    fotos: fotos.map(nome => ({
      nome,
      previa: `/api/fotos/thumbs/${pedido.event_year}/${nome}`,
      // O endereço do arquivo em alta só existe quando está pago e no prazo.
      download: liberado ? `/api/fotos/download?t=${encodeURIComponent(token)}&f=${encodeURIComponent(nome)}` : null,
    })),
  });
};
