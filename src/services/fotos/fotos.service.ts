/**
 * Galeria de fotos do evento e compra das fotos em alta.
 *
 * O álbum inteiro vem numa requisição só (o manifesto), e não paginado: são
 * ~2900 nomes de arquivo, algo em torno de 150 KB, e é o que permite a tela
 * rolar sem ir ao servidor a cada tela de miniaturas.
 */

export interface AlbumBloco {
  titulo: string;
  total: number;
}

export interface AlbumFoto {
  /** Nome do arquivo. É o identificador da foto em todo o fluxo de compra. */
  n: string;
  /** Índice do bloco a que a foto pertence. */
  b: number;
}

export interface AlbumManifesto {
  ano: number;
  total: number;
  /** Álbum vendendo o arquivo em alta agora. Falso em álbum gratuito ou com prazo vencido. */
  venda: boolean;
  /** Data em que a venda se encerra (ISO). Serve para o aviso na tela. */
  venda_ate?: string;
  blocos: AlbumBloco[];
  fotos: AlbumFoto[];
}

export interface FotoDoPedido {
  nome: string;
  previa: string;
  download: string | null;
}

export interface PedidoDeFotos {
  status: "PENDING" | "PAID" | "CANCELED";
  nome: string;
  email: string;
  ano: number;
  quantidade: number;
  valor_total_centavos: number;
  qrCodeText: string | null;
  qrCodeImageUrl: string | null;
  baixavel: boolean;
  downloads_expiram_em: string | null;
  fotos: FotoDoPedido[];
}

export interface PedidoCriado {
  token: string;
  quantidade: number;
  valor_unitario_centavos: number;
  valor_total_centavos: number;
  qrCodeText: string;
  qrCodeImageUrl: string | null;
}

export function urlDaMiniatura(ano: number, nome: string): string {
  return `/api/fotos/thumbs/${ano}/${encodeURIComponent(nome)}`;
}

export function urlDaPrevia(ano: number, nome: string): string {
  return `/api/fotos/previews/${ano}/${encodeURIComponent(nome)}`;
}

/** Devolve null quando o ano não tem álbum no R2 — a galeria antiga assume. */
export async function buscarAlbum(
  ano: number,
  signal?: AbortSignal
): Promise<AlbumManifesto | null> {
  const resposta = await fetch(`/api/fotos/album?ano=${ano}`, { signal });
  if (!resposta.ok) return null;
  return (await resposta.json()) as AlbumManifesto;
}

export async function criarPedido(entrada: {
  nome: string;
  email: string;
  ano: number;
  fotos: string[];
}): Promise<PedidoCriado> {
  const resposta = await fetch("/api/fotos/pedido", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });

  const corpo = await resposta.json();
  if (!resposta.ok) {
    throw new Error(String(corpo?.error ?? "pedido_falhou"));
  }
  return corpo as PedidoCriado;
}

export async function buscarPedido(
  token: string,
  signal?: AbortSignal
): Promise<PedidoDeFotos | null> {
  const resposta = await fetch(`/api/fotos/pedido?t=${encodeURIComponent(token)}`, { signal });
  if (!resposta.ok) return null;
  return (await resposta.json()) as PedidoDeFotos;
}

export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
