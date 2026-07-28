// Formatação e busca compartilhadas pela tela de inscritos e pelo credenciamento.

/**
 * Remove acentos e baixa a caixa para a busca ignorar diacríticos
 * (ex.: "julio" encontra "Júlio", "jose" encontra "José").
 */
export const norm = (v: string | null | undefined): string =>
  (v ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const inc = (v: string | null | undefined, q: string): boolean =>
  norm(v).includes(norm(q).trim());

export const hasText = (v: string | null | undefined): boolean => (v ?? "").trim().length > 0;

/** Ordenação que ignora acento e caixa (ex.: "Élida" entra junto do E). */
export const byName = (a: { name: string }, b: { name: string }): number =>
  (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" });

const LOWER = new Set([
  "de", "da", "do", "das", "dos", "e", "di", "du", "del", "della", "van", "von", "y",
]);

export const formatName = (raw: string | null | undefined): string => {
  const v = (raw ?? "").trim();
  if (!v) return "—";
  return v
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && LOWER.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
};

export const formatDob = (dob: string | null): string => {
  if (!dob) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : dob;
};

/**
 * O datetime('now') do SQLite grava UTC sem fuso ("2026-08-02 10:42:07"). Sem o
 * "Z" o navegador leria como hora local e mostraria 3h a menos — na portaria,
 * um horário errado destrói a confiança na baixa.
 */
export const formatCheckinTime = (value: string | null): string => {
  if (!value) return "—";
  const iso = /[zZ]$/.test(value) ? value.replace(" ", "T") : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Só o usuário do e-mail: no celular não cabe "fulano@provedor.com.br". */
export const shortEmail = (email: string | null | undefined): string => {
  const v = (email ?? "").trim();
  if (!v) return "—";
  return v.split("@")[0];
};
