/// <reference types="@cloudflare/workers-types" />
import { badRequest, notFound } from "../../_utils/responses";
import {
  FIM_DA_VENDA_PADRAO,
  GalleryManifest,
  isValidYear,
  manifestKey,
  vendaAberta,
} from "../../_utils/photoGallery";

interface Env {
  PHOTOS: R2Bucket;
  PHOTO_SALE_UNTIL?: string;
}

/**
 * GET /api/fotos/album?ano=2026 — índice do álbum.
 *
 * Devolve o manifesto inteiro numa requisição só (2882 nomes ≈ 60 KB, ~20 KB
 * comprimido). Foi o que substituiu a listagem pela API do GitHub, que devolve
 * no máximo 1000 arquivos por pasta e deixaria 1882 fotos invisíveis.
 *
 * Sem paginação de propósito: com a lista em mãos, a tela decide quantas
 * miniaturas desenhar e busca cada imagem só quando ela chega perto da janela.
 * Paginar aqui traria uma ida ao servidor a cada rolagem, sem ganho nenhum.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const ano = new URL(context.request.url).searchParams.get("ano") ?? "";
  if (!isValidYear(ano)) return badRequest("invalid_year");

  const objeto = await context.env.PHOTOS.get(manifestKey(Number(ano)));
  if (!objeto) return notFound("album_not_found");

  const manifesto = await objeto.json<GalleryManifest>();

  // Quem decide se a venda está aberta é o servidor, não o relógio do celular
  // de quem visita: relógio adiantado ou atrasado mudaria a tela de lugar.
  const vende = manifesto.venda !== false && vendaAberta(context.env);
  const resposta: GalleryManifest & { venda_ate: string } = {
    ...manifesto,
    venda: vende,
    venda_ate: context.env.PHOTO_SALE_UNTIL?.trim() || FIM_DA_VENDA_PADRAO,
  };

  return new Response(JSON.stringify(resposta), {
    headers: {
      "Content-Type": "application/json",
      // 5 min: o álbum de um evento que já aconteceu muda pouco, mas ainda pode
      // receber correção (foto retirada a pedido de alguém). Um ano de cache
      // deixaria essa retirada sem efeito na prática.
      "Cache-Control": "public, max-age=300",
    },
  });
};
