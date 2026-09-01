/// <reference types="@cloudflare/workers-types" />

/**
 * Galeria de fotos do evento (bloco 9 do Planning.md).
 *
 * Quatro prefixos no MESMO balde do R2, com finalidades diferentes:
 *
 *   thumbs/<ano>/    400px   -> miniatura da grade                    | público
 *   previews/<ano>/  1200px  -> foto que abre ao clicar               | público
 *   medias/<ano>/    2048px  -> o que se baixa depois da venda        | público
 *   originais/<ano>/ arquivo da câmera                                | PRIVADO
 *
 * A marca d'água é gravada no arquivo pelo script de processamento e depende do
 * momento do álbum: enquanto ele VENDE, thumbs e previews saem com a trama por
 * toda a foto. Encerrada a venda, o ano é regravado limpo (foi o que 2026 fez em
 * 01/09/2026). Nada disso é decidido aqui — aqui só se serve o que está no balde.
 *
 * ⚠️ `originais/` só sai daqui com link assinado e vencimento, depois do PIX
 * pago. É o produto vendido; servir esse prefixo pelo caminho público entregaria
 * de graça o que a pessoa acabou de comprar.
 *
 * ⚠️ `medias/` é público SÓ DEPOIS que a venda daquele ano acaba — ver
 * `mediasLiberadas`. Enquanto a venda está aberta, 2048px limpo seria o arquivo
 * vendido saindo pela porta da frente.
 */

export const GALLERY_PREFIXES = ["thumbs", "previews", "medias"] as const;
export type GalleryPrefix = (typeof GALLERY_PREFIXES)[number];

/** Chave do manifesto do ano: índice estático da galeria, gerado no processamento. */
export function manifestKey(year: number): string {
  return `manifestos/${year}.json`;
}

export function originalKey(year: number, filename: string): string {
  return `originais/${year}/${filename}`;
}

export function mediaPrefix(year: number): string {
  return `medias/${year}/`;
}

export interface ManifestPhoto {
  /** Nome do arquivo, igual nos três prefixos. É o identificador da foto. */
  n: string;
  /** Bloco a que a foto pertence (índice em `blocos`). */
  b: number;
}

export interface ManifestBlock {
  /** Rótulo do trecho, ex.: "Largada — 4h30 às 5h10". */
  titulo: string;
  /** Quantidade de fotos do bloco, para a tela não precisar contar. */
  total: number;
}

export interface GalleryManifest {
  ano: number;
  total: number;
  /**
   * Album que vende o arquivo em alta. `false` = album gratuito (2025), onde a
   * tela esconde a escolha de fotos e libera o download da prévia.
   * Ausente conta como `true`: o manifesto de 2026 nasceu antes deste campo.
   */
  venda?: boolean;
  blocos: ManifestBlock[];
  fotos: ManifestPhoto[];
}

export interface GalleryEnv {
  PHOTOS: R2Bucket;
  PHOTO_SALE_UNTIL?: string;
}

/**
 * A venda das fotos de 2026 tem prazo: até 31/08/2026 o arquivo em alta é
 * vendido (a doação); depois disso, o álbum fica gratuito em baixa resolução.
 * O aviso na tela promete isso — quem faz valer é esta função, senão alguém
 * teria de lembrar de desligar a venda na data certa.
 *
 * A data vem da env para poder ser esticada sem novo deploy.
 */
export const FIM_DA_VENDA_PADRAO = "2026-08-31T23:59:59-03:00";

export function vendaAberta(env: { PHOTO_SALE_UNTIL?: string }, agora = new Date()): boolean {
  const bruto = env.PHOTO_SALE_UNTIL?.trim() || FIM_DA_VENDA_PADRAO;
  const limite = new Date(bruto).getTime();
  // Data inválida na env não pode virar "venda fechada para sempre" nem
  // "aberta para sempre" sem ninguém perceber: cai no padrão e registra.
  if (!Number.isFinite(limite)) {
    console.warn(`PHOTO_SALE_UNTIL inválido ("${bruto}"), usando ${FIM_DA_VENDA_PADRAO}.`);
    return agora.getTime() <= new Date(FIM_DA_VENDA_PADRAO).getTime();
  }
  return agora.getTime() <= limite;
}

/**
 * Este álbum vende o arquivo em alta AGORA?
 *
 * Duas perguntas numa só: o manifesto do ano marca álbum de venda, e o prazo
 * ainda não venceu. É a MESMA conta que `/api/fotos/album` mostra na tela — se
 * as duas divergirem, a tela oferece o download em média e a rota devolve 404.
 *
 * Ano sem manifesto responde "vende": prudência. O ano que ainda não foi
 * publicado não pode ter as fotos liberadas por engano.
 */
export async function albumVende(env: GalleryEnv, year: number, agora = new Date()): Promise<boolean> {
  const objeto = await env.PHOTOS.get(manifestKey(year));
  if (!objeto) return true;

  const manifesto = await objeto.json<GalleryManifest>();
  return manifesto.venda !== false && vendaAberta(env, agora);
}

/** O ano já tem a pasta de média resolução no balde? */
export async function temMedias(env: GalleryEnv, year: number): Promise<boolean> {
  const lista = await env.PHOTOS.list({ prefix: mediaPrefix(year), limit: 1 });
  return lista.objects.length > 0;
}

/**
 * Memória de curta duração do isolate.
 *
 * `mediasLiberadas` é chamada em CADA foto que o cache do edge não tem — são
 * 2882 por álbum. Sem isto, cada uma delas custaria um GET do manifesto (150 KB)
 * só para responder um sim ou não que muda uma vez por ano.
 *
 * Cinco minutos é o mesmo fôlego que `/api/fotos/album` já dá ao navegador: no
 * pior caso, a virada da venda demora esse tanto para valer em todo lugar.
 */
const MEMO_TTL_MS = 5 * 60 * 1000;
const memo = new Map<string, { valor: boolean; expira: number }>();

async function memoizado(chave: string, calcular: () => Promise<boolean>, agora: number): Promise<boolean> {
  const guardado = memo.get(chave);
  if (guardado && guardado.expira > agora) return guardado.valor;

  const valor = await calcular();
  memo.set(chave, { valor, expira: agora + MEMO_TTL_MS });
  return valor;
}

/** Só para os testes: o memo é global e vazaria de um caso para o outro. */
export function limparMemoDaGaleria(): void {
  memo.clear();
}

/**
 * Pode servir `medias/<ano>/` pela rota pública?
 *
 * Só depois que aquele ano parou de vender. A trava é por ANO, e não pela data
 * global: quando 2027 estiver em venda, o álbum de 2026 continua liberado.
 */
export async function mediasLiberadas(env: GalleryEnv, year: number, agora = new Date()): Promise<boolean> {
  return !(await memoizado(`vende:${year}`, () => albumVende(env, year, agora), agora.getTime()));
}

/**
 * Nome de arquivo aceito na URL pública.
 *
 * Recusa qualquer coisa com barra, ".." ou caractere fora do conjunto que o
 * upload já sanitiza. Sem isto, "../originais/2026/foto.jpg" na URL da miniatura
 * entregaria o arquivo em alta — o produto vendido — pelo caminho público.
 */
const NOME_VALIDO = /^[a-zA-Z0-9._-]{1,120}$/;

export function isSafePhotoName(name: string): boolean {
  return NOME_VALIDO.test(name) && !name.includes("..");
}

export function isGalleryPrefix(value: string): value is GalleryPrefix {
  return (GALLERY_PREFIXES as readonly string[]).includes(value);
}

export function isValidYear(value: string): boolean {
  return /^\d{4}$/.test(value);
}
