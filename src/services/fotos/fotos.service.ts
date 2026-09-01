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
  /**
   * As fotos em média resolução (2048px) estão publicadas e liberadas.
   * Quem responde é o servidor: pedir a média num ano que não tem, ou que ainda
   * está vendendo, devolve 404 e a tela mostraria imagem quebrada.
   */
  medias?: boolean;
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

/**
 * Versão da publicação das fotos. Vai como `?v=` em toda URL de imagem.
 *
 * ⚠️ SUBA ESTE NÚMERO sempre que um arquivo for REGRAVADO por cima no R2 (foi o
 * que aconteceu em 01/09/2026, quando 2026 perdeu a marca d'água). As fotos são
 * servidas com `Cache-Control: immutable` de um ano: sem trocar a URL, quem já
 * abriu o álbum continuaria vendo a versão antiga por meses, e o CDN também.
 *
 * Não é preciso mexer aqui quando entram fotos NOVAS: nome novo, URL nova.
 *
 * histórico
 *   1  06/08/2026  publicação do álbum de 2026, com marca d'água
 *   2  01/09/2026  2026 regravado sem marca, depois do fim da venda
 */
const VERSAO_DAS_FOTOS = "2";

function comVersao(caminho: string): string {
  return `${caminho}?v=${VERSAO_DAS_FOTOS}`;
}

export function urlDaMiniatura(ano: number, nome: string): string {
  return comVersao(`/api/fotos/thumbs/${ano}/${encodeURIComponent(nome)}`);
}

export function urlDaPrevia(ano: number, nome: string): string {
  return comVersao(`/api/fotos/previews/${ano}/${encodeURIComponent(nome)}`);
}

/**
 * Foto em média resolução: 2048px.
 *
 * É o que o álbum entrega depois que a venda acaba. Só existe quando o
 * manifesto diz `medias: true` — chamar sem isso dá 404.
 */
export function urlDaMedia(ano: number, nome: string): string {
  return comVersao(`/api/fotos/medias/${ano}/${encodeURIComponent(nome)}`);
}

/**
 * A melhor versão pública que este álbum tem para abrir e para baixar.
 *
 * Média quando ela existe; prévia (1200px) no resto. A tela toda usa esta
 * função em vez de escolher o prefixo em cada lugar: assim "ampliar" e "baixar"
 * nunca discordam sobre qual arquivo é o bom.
 */
export function urlDaFotoPublica(manifesto: AlbumManifesto, nome: string): string {
  return manifesto.medias
    ? urlDaMedia(manifesto.ano, nome)
    : urlDaPrevia(manifesto.ano, nome);
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

/** O que o servidor responde sobre a busca por rosto de um ano. */
export interface BuscaPorRostoDisponivel {
  disponivel: true;
  /** Arquivo do reconhecedor que indexou o álbum. A tela TEM de baixar este. */
  modelo: string;
  /** Tamanho do reconhecedor em bytes, para a tela avisar antes de baixar. */
  modelo_bytes: number;
  detector: string;
  dim: number;
  limiar: number;
  min_rosto_px: number;
  total_rostos: number;
  total_fotos: number;
}

export type DisponibilidadeDaBusca = BuscaPorRostoDisponivel | { disponivel: false };

export interface FotoEncontrada {
  nome: string;
  /** Semelhança com a selfie, de 0 a 1. A lista já vem da maior para a menor. */
  score: number;
}

/**
 * O álbum deste ano tem busca por rosto?
 *
 * Perguntado ao abrir o álbum. São ~200 bytes, e é o que evita oferecer o botão
 * num ano sem índice — a pessoa esperaria 39 MB de download para receber
 * "não encontrei nada".
 */
export async function disponibilidadeDaBusca(
  ano: number,
  signal?: AbortSignal
): Promise<DisponibilidadeDaBusca> {
  try {
    const resposta = await fetch(`/api/fotos/rosto?ano=${ano}`, { signal });
    if (!resposta.ok) return { disponivel: false };
    return (await resposta.json()) as DisponibilidadeDaBusca;
  } catch {
    return { disponivel: false };
  }
}

/**
 * Manda os 128 números da selfie e recebe as fotos em que a pessoa aparece.
 *
 * ⚠️ A selfie NÃO viaja. O que sai daqui é o vetor gerado dentro do navegador
 * (src/services/fotos/rosto), do qual não se remonta a imagem, mais o tamanho do
 * rosto — que o servidor precisa saber para recusar selfie ruim, já que não tem
 * a foto para conferir sozinho.
 */
export async function buscarPorRosto(
  entrada: { ano: number; vetor: number[]; rostoPx: number },
  signal?: AbortSignal
): Promise<FotoEncontrada[]> {
  const resposta = await fetch("/api/fotos/rosto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ano: entrada.ano, vetor: entrada.vetor, rosto_px: entrada.rostoPx }),
    signal,
  });

  const corpo = await resposta.json();
  if (!resposta.ok) throw new Error(String(corpo?.error ?? "busca_falhou"));

  return (corpo.fotos ?? []) as FotoEncontrada[];
}
