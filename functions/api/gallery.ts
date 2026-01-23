/// <reference types="@cloudflare/workers-types" />

interface Env {
  GITHUB_GALLERY_REPO?: string;
  GITHUB_GALLERY_BRANCH?: string;
  GITHUB_GALLERY_TOKEN?: string;
  GALLERY_YEARS?: string;
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
}

const DEFAULT_REPO = "cassiotakarada/caminhodoperdao-gallery";
const DEFAULT_BRANCH = "main";
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

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
        coverUrl: pickCover(photos),
      });
    }

    return jsonResponse(200, { albums });
  } catch (error) {
    console.error("Gallery API error:", error);
    return jsonResponse(500, { error: "gallery_fetch_failed" });
  }
};

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
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = new URL(`https://api.github.com/repos/${repo}/contents/${path}`);
  url.searchParams.set("ref", branch);

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`github_api_error:${response.status}`);
  }
  const data = (await response.json()) as GithubContentItem[] | GithubContentItem;
  if (Array.isArray(data)) {
    return data;
  }
  return [];
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

