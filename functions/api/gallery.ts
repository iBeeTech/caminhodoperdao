/// <reference types="@cloudflare/workers-types" />
import { GalleryManifest, manifestKey } from "../_utils/photoGallery";

interface Env {
  GITHUB_GALLERY_REPO?: string;
  GITHUB_GALLERY_BRANCH?: string;
  GITHUB_GALLERY_TOKEN?: string;
  GALLERY_YEARS?: string;
  PHOTOS?: R2Bucket;
}

interface GithubContentItem {
  name: string;
  path: string;
  type: "file" | "dir";
}

interface GalleryPhoto {
  url: string;
  alt?: string;
}

interface GalleryAlbum {
  year: number;
  coverUrl?: string;
  photos: GalleryPhoto[];
  /** Total real de fotos do ano. `photos` traz só uma amostra quando o ano vem do R2. */
  total?: number;
  /** Ano servido pelo R2: a tela do álbum busca o índice em /api/fotos/album. */
  source?: "r2" | "github";
}

const DEFAULT_REPO = "iBeeTech/caminhodoperdao-gallery";
const DEFAULT_BRANCH = "main";
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
/** Quantas fotos vão na amostra do ano no R2 — o suficiente para a capa da vitrine. */
const AMOSTRA_R2 = 12;

export const onRequestGet: PagesFunction<Env> = async context => {
  try {
    const repo = (context.env.GITHUB_GALLERY_REPO || DEFAULT_REPO).trim();
    const branch = (context.env.GITHUB_GALLERY_BRANCH || DEFAULT_BRANCH).trim();
    const token = context.env.GITHUB_GALLERY_TOKEN?.trim();
    const explicitYears = parseYears(context.env.GALLERY_YEARS);

    const rootItems = await fetchGithubContents(repo, branch, "", token);
    const folderYears = rootItems
      .filter(item => item.type === "dir" && /^\d{4}$/.test(item.name))
      .map(item => Number(item.name));

    const allYears = uniqueYears([...folderYears, ...explicitYears]).sort((a, b) => b - a);
    const albums: GalleryAlbum[] = [];

    for (const year of allYears) {
      // Ano com manifesto no R2 tem precedência: é o caminho novo, e a pasta
      // antiga no GitHub pode continuar existindo com um punhado de fotos.
      const doR2 = await buildAlbumFromR2(context.env, year);
      if (doR2) {
        albums.push(doR2);
        continue;
      }

      const folder = String(year);
      const items = await fetchGithubContents(repo, branch, folder, token);
      const photos = items
        .filter(item => item.type === "file" && isImage(item.name))
        .map(item => ({
          url: buildRawUrl(repo, branch, item.path),
        }));

      albums.push({
        year,
        photos,
        total: photos.length,
        source: "github",
        coverUrl: pickCover(photos),
      });
    }

    return jsonResponse(200, { albums });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const githubStatus = parseGithubStatus(message);
    console.error("Gallery API error:", message);
    return jsonResponse(500, {
      error: "gallery_fetch_failed",
      github_status: githubStatus ?? undefined,
    });
  }
};

/**
 * Monta o álbum de um ano a partir do manifesto no R2.
 *
 * Devolve só uma AMOSTRA de fotos, não as 2882: esta resposta alimenta a
 * vitrine de álbuns, onde aparece uma capa por ano. A lista inteira sai em
 * /api/fotos/album, que a tela do álbum busca sozinha.
 */
async function buildAlbumFromR2(env: Env, year: number): Promise<GalleryAlbum | null> {
  if (!env.PHOTOS) return null;

  try {
    const objeto = await env.PHOTOS.get(manifestKey(year));
    if (!objeto) return null;

    const manifesto = await objeto.json<GalleryManifest>();
    const nomes = Array.isArray(manifesto.fotos) ? manifesto.fotos : [];
    if (!nomes.length) return null;

    const amostra = nomes.slice(0, AMOSTRA_R2).map(foto => ({
      url: `/api/fotos/previews/${year}/${foto.n}`,
    }));

    return {
      year,
      photos: amostra,
      total: manifesto.total ?? nomes.length,
      source: "r2",
      // Capa fixa (a primeira), e não sorteada: sorteio troca a imagem a cada
      // visita e ainda quebra o cache do navegador sem motivo.
      coverUrl: `/api/fotos/thumbs/${year}/${nomes[0].n}`,
    };
  } catch (error) {
    console.error(`Falha ao ler manifesto do R2 (${year}):`, error);
    return null;
  }
}

function parseYears(input?: string): number[] {
  if (!input) return [];
  return input
    .split(",")
    .map(value => Number(value.trim()))
    .filter(value => Number.isFinite(value));
}

function uniqueYears(years: number[]): number[] {
  return Array.from(new Set(years));
}

function isImage(filename: string): boolean {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function buildRawUrl(repo: string, branch: string, path: string): string {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
}

function pickCover(photos: GalleryPhoto[]): string | undefined {
  if (!photos.length) return undefined;
  const index = Math.floor(Math.random() * photos.length);
  return photos[index]?.url;
}

async function fetchGithubContents(
  repo: string,
  branch: string,
  path: string,
  token?: string
): Promise<GithubContentItem[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "caminhodoperdao-gallery",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = new URL(`https://api.github.com/repos/${repo}/contents/${path}`);
  url.searchParams.set("ref", branch);

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`github_api_error:${response.status}`);
  }
  const data = (await response.json()) as GithubContentItem[] | GithubContentItem;
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

function parseGithubStatus(message: string): number | null {
  if (!message.startsWith("github_api_error:")) {
    return null;
  }
  const statusText = message.replace("github_api_error:", "");
  const status = Number(statusText);
  return Number.isFinite(status) ? status : null;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}

