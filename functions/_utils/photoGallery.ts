/// <reference types="@cloudflare/workers-types" />

/**
 * Galeria de fotos do evento (bloco 9 do Planning.md).
 *
 * Três prefixos no MESMO balde do R2, com finalidades diferentes:
 *
 *   thumbs/<ano>/    400px,  marca gravada  -> miniatura da grade   | público
 *   previews/<ano>/  1200px, marca gravada  -> foto que abre ao clicar | público
 *   originais/<ano>/ arquivo da câmera, sem marca                   | PRIVADO
 *
 * ⚠️ `originais/` só sai daqui com link assinado e vencimento, depois do PIX
 * pago. É o produto vendido; servir esse prefixo pelo caminho público entregaria
 * de graça o que a pessoa acabou de comprar.
 */

export const GALLERY_PREFIXES = ["thumbs", "previews"] as const;
export type GalleryPrefix = (typeof GALLERY_PREFIXES)[number];

/** Chave do manifesto do ano: índice estático da galeria, gerado no processamento. */
export function manifestKey(year: number): string {
  return `manifestos/${year}.json`;
}

export function originalKey(year: number, filename: string): string {
  return `originais/${year}/${filename}`;
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
