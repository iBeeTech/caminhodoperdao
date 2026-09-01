/// <reference types="@cloudflare/workers-types" />
import { beforeEach, describe, it, expect } from "vitest";

import {
  FIM_DA_VENDA_PADRAO,
  GalleryEnv,
  albumVende,
  isSafePhotoName,
  isGalleryPrefix,
  isValidYear,
  limparMemoDaGaleria,
  manifestKey,
  mediaPrefix,
  mediasLiberadas,
  originalKey,
  temMedias,
  vendaAberta,
} from "../../functions/_utils/photoGallery";
import {
  MAX_FOTOS_POR_PEDIDO,
  diasDeDownload,
  gerarTokenDoPedido,
  hashTokenDoPedido,
  normalizarFotos,
  podeBaixar,
  precoUnitarioCentavos,
  PhotoOrderRow,
} from "../../functions/_utils/photoOrders";

/**
 * O que se testa aqui é o que separa "foto com marca, de graça" de "arquivo em
 * alta, que foi vendido". Tudo nesta lista falha em SILÊNCIO: a página continua
 * bonita, ninguém vê erro, e só se descobre quando as fotos já vazaram ou quando
 * alguém pagou por um arquivo que não veio.
 */

function pedidoFake(extra: Partial<PhotoOrderRow> = {}): PhotoOrderRow {
  return {
    id: "pedido-1",
    customer_name: "Maria",
    email: "maria@exemplo.com",
    event_year: 2026,
    photo_count: 2,
    unit_price_cents: 500,
    amount_cents: 1000,
    status: "PAID",
    payment_ref: "ref-1",
    correlation_id: null,
    provider_charge_id: null,
    qr_code_text: null,
    qr_code_image: null,
    access_token_hash: "x",
    downloads_expire_at: null,
    created_at: "2026-08-06 10:00:00",
    paid_at: "2026-08-06 10:05:00",
    ...extra,
  };
}

describe("isSafePhotoName", () => {
  it("aceita o nome que a câmera gera", () => {
    expect(isSafePhotoName("_DSC5746.jpg")).toBe(true);
    expect(isSafePhotoName("IMG_8215.jpg")).toBe(true);
  });

  it("recusa caminho, para a URL pública não alcançar o arquivo em alta", () => {
    // Sem isto, /api/fotos/thumbs/2026/../originais/2026/_DSC5746.jpg entregaria
    // de graça exatamente o que está à venda.
    expect(isSafePhotoName("../originais/2026/_DSC5746.jpg")).toBe(false);
    expect(isSafePhotoName("..")).toBe(false);
    expect(isSafePhotoName("pasta/foto.jpg")).toBe(false);
    expect(isSafePhotoName("C:\\fotos\\a.jpg")).toBe(false);
  });

  it("recusa vazio e nome absurdamente longo", () => {
    expect(isSafePhotoName("")).toBe(false);
    expect(isSafePhotoName("a".repeat(200) + ".jpg")).toBe(false);
  });
});

describe("prefixos e ano", () => {
  it("thumbs, previews e medias são públicos", () => {
    expect(isGalleryPrefix("thumbs")).toBe(true);
    expect(isGalleryPrefix("previews")).toBe(true);
    // medias passa pela rota, mas com trava de venda (ver mediasLiberadas).
    expect(isGalleryPrefix("medias")).toBe(true);
    // O prefixo do arquivo vendido NUNCA pode passar pela rota pública.
    expect(isGalleryPrefix("originais")).toBe(false);
    expect(isGalleryPrefix("manifestos")).toBe(false);
  });

  it("ano é sempre quatro dígitos", () => {
    expect(isValidYear("2026")).toBe(true);
    expect(isValidYear("26")).toBe(false);
    expect(isValidYear("../")).toBe(false);
  });

  it("monta as chaves do balde", () => {
    expect(manifestKey(2026)).toBe("manifestos/2026.json");
    expect(originalKey(2026, "_DSC1.jpg")).toBe("originais/2026/_DSC1.jpg");
    expect(mediaPrefix(2026)).toBe("medias/2026/");
  });
});

/**
 * A média resolução (2048px, sem trama) é o presente de depois da venda. Se ela
 * escapar ENQUANTO o álbum vende, quem ia doar R$ 5 baixa de graça uma foto que
 * serve para quase tudo — e ninguém vê erro nenhum na tela.
 */
describe("liberação da média resolução", () => {
  function baldeFake(manifesto: unknown | null, medias: string[] = []): GalleryEnv["PHOTOS"] {
    return {
      get: async (chave: string) =>
        chave === manifestKey(2026) && manifesto
          ? ({ json: async () => manifesto } as never)
          : null,
      list: async ({ prefix }: { prefix: string }) => ({
        objects: medias.filter(chave => chave.startsWith(prefix)).map(key => ({ key })),
      }),
    } as unknown as GalleryEnv["PHOTOS"];
  }

  const DENTRO_DO_PRAZO = new Date("2026-08-20T10:00:00-03:00");
  const DEPOIS_DO_PRAZO = new Date("2026-09-01T10:00:00-03:00");

  beforeEach(() => limparMemoDaGaleria());

  it("não libera enquanto o álbum vende", async () => {
    const env = { PHOTOS: baldeFake({ ano: 2026, venda: true }) };
    expect(await albumVende(env, 2026, DENTRO_DO_PRAZO)).toBe(true);
    expect(await mediasLiberadas(env, 2026, DENTRO_DO_PRAZO)).toBe(false);
  });

  it("libera quando o prazo da venda vence", async () => {
    // Manifesto sem o campo `venda` é o de 2026, que nasceu antes dele: conta
    // como álbum de venda, e quem desliga é a data.
    const env = { PHOTOS: baldeFake({ ano: 2026 }) };
    expect(await mediasLiberadas(env, 2026, DENTRO_DO_PRAZO)).toBe(false);
    limparMemoDaGaleria();
    expect(await mediasLiberadas(env, 2026, DEPOIS_DO_PRAZO)).toBe(true);
  });

  it("libera álbum gratuito mesmo dentro do prazo", async () => {
    const env = { PHOTOS: baldeFake({ ano: 2026, venda: false }) };
    expect(await mediasLiberadas(env, 2026, DENTRO_DO_PRAZO)).toBe(true);
  });

  it("ano sem manifesto não libera nada", async () => {
    // Prudência: o ano que ainda não foi publicado não pode ter as fotos
    // liberadas por um manifesto que ainda não subiu.
    const env = { PHOTOS: baldeFake(null) };
    expect(await mediasLiberadas(env, 2026, DEPOIS_DO_PRAZO)).toBe(false);
  });

  it("temMedias responde pelo balde, e não por campo do manifesto", async () => {
    const env = { PHOTOS: baldeFake({ ano: 2026 }, ["medias/2026/_DSC1.jpg"]) };
    expect(await temMedias(env, 2026)).toBe(true);
    expect(await temMedias(env, 2025)).toBe(false);
  });
});

describe("normalizarFotos", () => {
  it("tira repetidas antes de o total ser calculado", () => {
    // Sem isto, a mesma foto mandada cinco vezes custaria R$ 25 por um arquivo
    // só — e o segundo INSERT quebraria na chave primária, deixando um pedido
    // pago e sem itens.
    const fotos = normalizarFotos(["a.jpg", "a.jpg", "b.jpg"]);
    expect(fotos).toEqual(["a.jpg", "b.jpg"]);
  });

  it("recusa a lista inteira quando um nome é perigoso", () => {
    expect(normalizarFotos(["a.jpg", "../originais/2026/b.jpg"])).toBeNull();
  });

  it("recusa lista vazia e coisa que não é lista", () => {
    expect(normalizarFotos([])).toBeNull();
    expect(normalizarFotos("a.jpg")).toBeNull();
    expect(normalizarFotos(null)).toBeNull();
    expect(normalizarFotos([1, 2])).toBeNull();
  });

  it("recusa carrinho acima do teto", () => {
    const muitas = Array.from({ length: MAX_FOTOS_POR_PEDIDO + 1 }, (_, i) => `foto${i}.jpg`);
    expect(normalizarFotos(muitas)).toBeNull();
  });
});

describe("preço", () => {
  it("usa R$ 5 quando a env não está definida", () => {
    expect(precoUnitarioCentavos({})).toBe(500);
  });

  it("lê reais e devolve centavos, com vírgula ou ponto", () => {
    expect(precoUnitarioCentavos({ PHOTO_PRICE: "7" })).toBe(700);
    expect(precoUnitarioCentavos({ PHOTO_PRICE: "5,50" })).toBe(550);
    expect(precoUnitarioCentavos({ PHOTO_PRICE: "5.50" })).toBe(550);
  });

  it("cai no padrão quando a env é lixo, em vez de cobrar zero", () => {
    // Cobrar zero por engano é pior do que cobrar o padrão: o PIX sairia com
    // valor inválido e ninguém veria erro nenhum.
    expect(precoUnitarioCentavos({ PHOTO_PRICE: "de graça" })).toBe(500);
    expect(precoUnitarioCentavos({ PHOTO_PRICE: "0" })).toBe(500);
    expect(precoUnitarioCentavos({ PHOTO_PRICE: "-3" })).toBe(500);
  });
});

describe("prazo de download", () => {
  it("usa 30 dias por padrão e aceita a env", () => {
    expect(diasDeDownload({})).toBe(30);
    expect(diasDeDownload({ PHOTO_DOWNLOAD_DAYS: "7" })).toBe(7);
    expect(diasDeDownload({ PHOTO_DOWNLOAD_DAYS: "zero" })).toBe(30);
    expect(diasDeDownload({ PHOTO_DOWNLOAD_DAYS: "0" })).toBe(30);
  });
});

describe("podeBaixar", () => {
  it("libera pedido pago sem prazo definido", () => {
    expect(podeBaixar(pedidoFake())).toBe(true);
  });

  it("não libera pedido que ainda não foi pago", () => {
    expect(podeBaixar(pedidoFake({ status: "PENDING" }))).toBe(false);
    expect(podeBaixar(pedidoFake({ status: "CANCELED" }))).toBe(false);
  });

  it("não libera depois do prazo", () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(podeBaixar(pedidoFake({ downloads_expire_at: ontem }))).toBe(false);
    expect(podeBaixar(pedidoFake({ downloads_expire_at: amanha }))).toBe(true);
  });
});

describe("prazo da venda", () => {
  // O álbum de 2026 ANUNCIA em vermelho que a venda vai até 31/08. Se só a tela
  // respeitasse a data, a promessa seria de fachada: uma requisição montada à
  // mão geraria PIX depois do prazo.
  const antes = new Date("2026-08-30T12:00:00-03:00");
  const depois = new Date("2026-09-01T12:00:00-03:00");

  it("fecha sozinha depois de 31/08, sem ninguém precisar desligar", () => {
    expect(vendaAberta({}, antes)).toBe(true);
    expect(vendaAberta({}, depois)).toBe(false);
  });

  it("aceita prazo esticado pela env, sem novo deploy", () => {
    const env = { PHOTO_SALE_UNTIL: "2026-12-31T23:59:59-03:00" };
    expect(vendaAberta(env, depois)).toBe(true);
  });

  it("vira o último minuto do dia 31, não o começo", () => {
    const trintaEUmDeManha = new Date("2026-08-31T09:00:00-03:00");
    expect(vendaAberta({}, trintaEUmDeManha)).toBe(true);
    expect(FIM_DA_VENDA_PADRAO.startsWith("2026-08-31T23:59")).toBe(true);
  });

  it("env com data inválida cai no padrão em vez de fechar ou abrir para sempre", () => {
    const env = { PHOTO_SALE_UNTIL: "trinta e um de agosto" };
    expect(vendaAberta(env, antes)).toBe(true);
    expect(vendaAberta(env, depois)).toBe(false);
  });
});

describe("token do pedido", () => {
  it("gera 64 hexadecimais e nunca repete", () => {
    const a = gerarTokenDoPedido();
    const b = gerarTokenDoPedido();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b);
  });

  it("guarda hash, não o segredo", async () => {
    const token = gerarTokenDoPedido();
    const hash = await hashTokenDoPedido(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
    // Mesmo segredo, mesmo hash: é assim que a busca no banco funciona.
    expect(await hashTokenDoPedido(token)).toBe(hash);
    expect(await hashTokenDoPedido(` ${token} `)).toBe(hash);
  });
});
