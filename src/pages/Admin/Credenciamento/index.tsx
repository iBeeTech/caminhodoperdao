import React from "react";
import { Link } from "react-router-dom";
import { byName, formatCheckinTime, formatName, inc, shortEmail } from "../Inscritos/format";
import { Registration } from "../Inscritos/types";

const STORAGE_KEY = "admin_jwt";
/** Acima disto a lista pede busca: 500 cartões no celular não rolam bem. */
const MAX_VISIBLE = 60;
/** A partir daqui a lista é tratada como velha e o aviso fica vermelho. */
const STALE_AFTER_MS = 45_000;
const TICK_MS = 5_000;

type FeedbackKind = "ok" | "warn" | "error";
interface Feedback {
  kind: FeedbackKind;
  text: string;
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: "0 auto", padding: "1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.4rem", margin: "0 0 0.9rem" },
  search: {
    width: "100%", boxSizing: "border-box", padding: "0.85rem 0.9rem", borderRadius: 10,
    border: "1px solid #d1d5db", fontSize: "1.05rem",
  },
  // Botão e contadores na mesma linha: o número só serve para conferir o efeito
  // do clique que está logo ao lado.
  actionsRow: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "10px 0",
  },
  // Azul, e não verde: o verde é a cor de "credenciar". Duas ações diferentes
  // com a mesma cor viram o mesmo botão aos olhos de quem está com pressa.
  refreshBtn: {
    minHeight: 52, padding: "0 1.4rem", borderRadius: 12, border: "none", background: "#1d4ed8",
    color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer",
    boxShadow: "0 2px 6px rgba(29,78,216,0.35)",
  },
  chip: {
    display: "inline-flex", alignItems: "baseline", gap: 6, padding: "0.5rem 0.9rem",
    borderRadius: 999, border: "1px solid", fontWeight: 700, fontSize: "0.9rem",
  },
  chipNum: { fontSize: "1.15rem", fontWeight: 900 },
  freshLine: { fontSize: "0.82rem", fontWeight: 700, margin: "0 0 0.75rem" },
  feedback: {
    margin: "0 0 0.75rem", padding: "0.6rem 0.8rem", borderRadius: 10, border: "1px solid",
    fontWeight: 700, fontSize: "0.9rem",
  },
  count: { color: "#6b7280", fontSize: "0.85rem", margin: "0 0 0.6rem" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  row: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.7rem 0.9rem", background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  rowDone: { borderColor: "#86efac", background: "#f6fef9" },
  name: { flex: "1 1 180px", fontSize: "1.05rem", fontWeight: 800, color: "#111827", lineHeight: 1.25 },
  actionBtn: {
    minHeight: 48, padding: "0 1.2rem", borderRadius: 10, border: "none", background: "#15803d",
    color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer",
    boxShadow: "0 2px 6px rgba(21,128,61,0.35)",
  },
  doneText: { fontSize: "0.85rem", fontWeight: 700, color: "#15803d" },
  undoBtn: {
    padding: "0.4rem 0.8rem", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
  },
  empty: { color: "#777", padding: "1.5rem 0" },
};

const FEEDBACK_STYLE: Record<FeedbackKind, React.CSSProperties> = {
  ok: { color: "#15803d", background: "#f0fdf4", borderColor: "#86efac" },
  warn: { color: "#b45309", background: "#fffbeb", borderColor: "#fcd34d" },
  error: { color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" },
};

const formatAge = (ms: number): string => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `há ${seconds}s`;
  return `há ${Math.floor(seconds / 60)} min`;
};

/**
 * Credenciamento presencial (/admin/credenciamento). Tela de ação, usada em pé
 * na portaria e no celular: só busca por nome, o botão de atualizar e um botão
 * por pessoa. Os painéis de números e os filtros da tela de inscritos ficaram
 * de fora de propósito — empurravam a busca para fora da primeira dobra.
 *
 * Vários voluntários credenciam ao mesmo tempo, então a tela nunca confia no
 * que tem em memória: a baixa é decidida no banco (UPDATE condicional). Se
 * outra pessoa já credenciou, o servidor responde 409 e a tela diz quem e quando.
 */
const CredenciamentoPage: React.FC = () => {
  const token = React.useMemo(() => localStorage.getItem(STORAGE_KEY), []);
  const [regs, setRegs] = React.useState<Registration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [lastLoadedAt, setLastLoadedAt] = React.useState<number | null>(null);
  const [query, setQuery] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);

  const load = React.useCallback(() => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/registrations?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setAuthError(true);
          return;
        }
        const data = (await res.json()) as { registrations?: Registration[] };
        setRegs(data.registrations ?? []);
        setLastLoadedAt(Date.now());
      })
      .catch(() => setAuthError(true))
      .finally(() => setLoading(false));
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Relógio próprio só para a idade da lista envelhecer sozinha na tela; sem
  // ele o "há 5s" ficaria congelado enquanto ninguém digita.
  const [nowTs, setNowTs] = React.useState<number>(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const ageMs = lastLoadedAt === null ? null : Math.max(0, nowTs - lastLoadedAt);
  const isStale = ageMs === null || ageMs > STALE_AFTER_MS;

  // Todo mundo que aparece na portaria: peregrinos pagos + staff (que entra na
  // base já como PAID, por cortesia).
  const paid = React.useMemo(() => regs.filter((r) => r.status === "PAID"), [regs]);
  const done = paid.filter((r) => Boolean(r.checked_in_at)).length;

  const visible = paid.filter((r) => inc(r.name, query)).sort(byName);

  const handleAction = async (reg: Registration, checkIn: boolean) => {
    if (!token || busyId) return;
    if (!checkIn && !window.confirm(`Desfazer o credenciamento de ${formatName(reg.name)}?`)) {
      return;
    }

    setBusyId(reg.id);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: reg.id, checkIn }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        checked_in_at?: string | null;
        checked_in_by?: string | null;
      };

      if (res.ok) {
        setFeedback({
          kind: "ok",
          text: checkIn
            ? `✅ ${formatName(reg.name)} credenciado.`
            : `↩️ Credenciamento de ${formatName(reg.name)} desfeito.`,
        });
      } else if (data.error === "already_checked_in") {
        setFeedback({
          kind: "warn",
          text: `⚠️ ${formatName(reg.name)} JÁ tinha sido credenciado por ${shortEmail(
            data.checked_in_by
          )} às ${formatCheckinTime(data.checked_in_at ?? null)}. Nada foi alterado.`,
        });
      } else if (data.error === "not_checked_in") {
        setFeedback({
          kind: "warn",
          text: `⚠️ ${formatName(reg.name)} não estava credenciado. Nada foi alterado.`,
        });
      } else if (data.error === "not_paid") {
        setFeedback({
          kind: "error",
          text: `${formatName(reg.name)} não está com a inscrição paga — não pode ser credenciado.`,
        });
      } else if (res.status === 401 || res.status === 403) {
        setFeedback({ kind: "error", text: "Sessão expirada. Entre de novo no admin." });
      } else if (res.status === 404) {
        setFeedback({ kind: "error", text: "Inscrição não encontrada. Atualize a lista." });
      } else {
        setFeedback({ kind: "error", text: "Não foi possível registrar. Tente de novo." });
      }

      // Sucesso ou conflito, a lista tem de voltar a refletir o banco.
      load();
    } catch {
      setFeedback({
        kind: "error",
        text: "Falha de conexão — a baixa NÃO foi registrada. Confira o sinal e tente de novo.",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (authError) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Credenciamento</h1>
        <p style={{ color: "#555" }}>
          Você precisa estar logado como admin. <Link to="/admin">Ir para o login</Link>.
        </p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Credenciamento</h1>

      <input
        style={s.search}
        placeholder="🔍 Buscar por nome…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div style={s.actionsRow}>
        <button type="button" style={s.refreshBtn} onClick={load} disabled={loading}>
          {loading ? "Atualizando…" : "🔄 Atualizar lista"}
        </button>
        <span style={{ ...s.chip, color: "#15803d", background: "#f0fdf4", borderColor: "#86efac" }}>
          Credenciado <span style={s.chipNum}>{done}</span>
        </span>
        <span style={{ ...s.chip, color: "#9a3412", background: "#fff7ed", borderColor: "#fed7aa" }}>
          A credenciar <span style={s.chipNum}>{paid.length}</span>
        </span>
      </div>

      <p style={{ ...s.freshLine, color: isStale ? "#b91c1c" : "#15803d" }}>
        {loading
          ? "Buscando dados do servidor…"
          : ageMs === null
          ? "Lista ainda não carregada"
          : `Lista atualizada ${formatAge(ageMs)}${
              isStale ? " — atualize antes de credenciar" : ""
            }`}
      </p>

      {feedback && (
        <p role="status" style={{ ...s.feedback, ...FEEDBACK_STYLE[feedback.kind] }}>
          {feedback.text}
        </p>
      )}

      <p style={s.count}>
        {visible.length} pessoa(s)
        {visible.length > MAX_VISIBLE && ` · mostrando as ${MAX_VISIBLE} primeiras, refine a busca`}
      </p>

      <div style={s.list}>
        {visible.slice(0, MAX_VISIBLE).map((r) => {
          const isDone = Boolean(r.checked_in_at);
          const isBusy = busyId === r.id;
          return (
            <div key={r.id} style={{ ...s.row, ...(isDone ? s.rowDone : {}) }}>
              <span style={s.name}>{formatName(r.name)}</span>
              {isDone ? (
                <>
                  <span style={s.doneText}>
                    ✅ {formatCheckinTime(r.checked_in_at)} · {shortEmail(r.checked_in_by)}
                  </span>
                  <button
                    type="button"
                    style={s.undoBtn}
                    onClick={() => handleAction(r, false)}
                    disabled={isBusy || loading}
                  >
                    {isBusy ? "…" : "Desfazer"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  style={{ ...s.actionBtn, opacity: isBusy || loading ? 0.6 : 1 }}
                  onClick={() => handleAction(r, true)}
                  disabled={isBusy || loading}
                >
                  {isBusy ? "Registrando…" : "✓ Credenciar"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {visible.length === 0 && !loading && <p style={s.empty}>Nenhuma pessoa encontrada.</p>}
    </div>
  );
};

export default CredenciamentoPage;
