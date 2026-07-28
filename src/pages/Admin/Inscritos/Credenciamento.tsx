import React from "react";
import { byName, formatCheckinTime, formatDob, formatName, inc, shortEmail } from "./format";
import { Registration } from "./types";

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

interface CredenciamentoProps {
  /** Todas as inscrições; o componente filtra os pagos. */
  regs: Registration[];
  loading: boolean;
  /** Quando a lista foi carregada do servidor (epoch ms). */
  lastLoadedAt: number | null;
  onReload: () => void;
  token: string | null;
}

const s: Record<string, React.CSSProperties> = {
  refreshBar: {
    position: "sticky", top: 0, zIndex: 10, background: "#fff",
    padding: "0.75rem 0", marginBottom: "0.75rem", borderBottom: "1px solid #e5e7eb",
    display: "flex", flexDirection: "column", gap: 8,
  },
  refreshBtn: {
    width: "100%", minHeight: 56, borderRadius: 12, border: "none", background: "#1f7a3d",
    color: "#fff", fontWeight: 800, fontSize: "1.05rem", cursor: "pointer",
  },
  freshLine: { fontSize: "0.82rem", fontWeight: 700, textAlign: "center" },
  hint: {
    fontSize: "0.82rem", color: "#92400e", background: "#fffbeb",
    border: "1px solid #fde68a", borderRadius: 8, padding: "0.5rem 0.7rem", margin: 0,
  },
  totalsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10, marginBottom: "0.9rem",
  },
  totalBox: { borderRadius: 12, padding: "0.8rem 1rem", border: "1px solid" },
  totalNum: { fontSize: "1.7rem", fontWeight: 800, lineHeight: 1.1 },
  totalLabel: { fontWeight: 600, fontSize: "0.85rem" },
  search: {
    width: "100%", boxSizing: "border-box", padding: "0.85rem 0.9rem", borderRadius: 10,
    border: "1px solid #d1d5db", fontSize: "1.05rem", marginBottom: 10,
  },
  chipsRow: {
    display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: "0.9rem",
  },
  field: {
    display: "inline-flex", flexDirection: "column", gap: 3, fontSize: "0.72rem",
    color: "#6b7280", fontWeight: 700,
  },
  miniSelect: {
    padding: "0.45rem 0.5rem", borderRadius: 8, border: "1px solid #d1d5db",
    fontSize: "0.9rem", background: "#fff",
  },
  count: { color: "#6b7280", fontSize: "0.85rem", margin: "0 0 0.6rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 },
  card: {
    border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.9rem 1rem", background: "#fff",
    display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  cardDone: { borderColor: "#86efac", background: "#f6fef9" },
  cardName: { fontSize: "1.1rem", fontWeight: 800, color: "#111827", lineHeight: 1.25 },
  cardRow: { fontSize: "0.86rem", color: "#374151" },
  alertMed: {
    fontSize: "0.86rem", fontWeight: 700, color: "#b91c1c", background: "#fef2f2",
    border: "1px solid #fecaca", borderRadius: 8, padding: "0.45rem 0.6rem",
  },
  alertRestr: {
    fontSize: "0.86rem", fontWeight: 700, color: "#92400e", background: "#fffbeb",
    border: "1px solid #fde68a", borderRadius: 8, padding: "0.45rem 0.6rem",
  },
  actionBtn: {
    width: "100%", minHeight: 52, borderRadius: 10, border: "none", background: "#15803d",
    color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer", marginTop: "auto",
  },
  doneBox: {
    marginTop: "auto", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac",
    padding: "0.6rem 0.7rem", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
  },
  doneText: { fontSize: "0.86rem", fontWeight: 700, color: "#15803d", flex: 1, minWidth: 150 },
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

const tag = (color: string, bg: string, border: string): React.CSSProperties => ({
  display: "inline-block", padding: "0.15rem 0.6rem", borderRadius: 999, fontWeight: 600,
  fontSize: "0.78rem", border: `1px solid ${border}`, color, background: bg,
});

const formatAge = (ms: number): string => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `há ${seconds}s`;
  return `há ${Math.floor(seconds / 60)} min`;
};

/**
 * Credenciamento presencial. Vive dentro de /admin/inscritos porque é a mesma
 * lista, só que em modo de ação: apenas PAGOS, busca grande e um botão por
 * pessoa.
 *
 * Vários voluntários credenciam ao mesmo tempo, então a tela nunca confia no
 * que tem em memória: o botão "Atualizar lista" fica no topo, grudado, e a
 * baixa em si é decidida no banco (UPDATE condicional). Se outra pessoa já
 * credenciou, o servidor responde 409 e a tela diz quem e quando.
 */
const Credenciamento: React.FC<CredenciamentoProps> = ({
  regs,
  loading,
  lastLoadedAt,
  onReload,
  token,
}) => {
  const [query, setQuery] = React.useState("");
  const [fPerfil, setFPerfil] = React.useState("");
  const [fSituacao, setFSituacao] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);

  // Relógio próprio só para a idade da lista envelhecer sozinha na tela; sem
  // ele o "há 5s" ficaria congelado enquanto ninguém digita.
  const [nowTs, setNowTs] = React.useState<number>(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const ageMs = lastLoadedAt === null ? null : Math.max(0, nowTs - lastLoadedAt);
  const isStale = ageMs === null || ageMs > STALE_AFTER_MS;

  const paid = React.useMemo(() => regs.filter((r) => r.status === "PAID"), [regs]);
  const done = paid.filter((r) => Boolean(r.checked_in_at)).length;
  const missing = paid.length - done;

  const visible = paid
    .filter(
      (r) =>
        inc(r.name, query) &&
        (!fPerfil || (fPerfil === "staff" ? r.is_staff === 1 : r.is_staff === 0)) &&
        (!fSituacao || (fSituacao === "feito" ? Boolean(r.checked_in_at) : !r.checked_in_at))
    )
    .sort(byName);

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
      onReload();
    } catch {
      setFeedback({
        kind: "error",
        text: "Falha de conexão — a baixa NÃO foi registrada. Confira o sinal e tente de novo.",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div style={s.refreshBar}>
        <button type="button" style={s.refreshBtn} onClick={onReload} disabled={loading}>
          {loading ? "Atualizando…" : "🔄 Atualizar lista"}
        </button>
        <div style={{ ...s.freshLine, color: isStale ? "#b91c1c" : "#15803d" }}>
          {loading
            ? "Buscando dados do servidor…"
            : ageMs === null
            ? "Lista ainda não carregada"
            : `Lista atualizada ${formatAge(ageMs)}${
                isStale ? " — atualize antes de credenciar" : ""
              }`}
        </div>
        <p style={s.hint}>
          Mais de uma pessoa credencia ao mesmo tempo.{" "}
          <strong>Clique em “Atualizar lista” antes de cada credenciamento</strong> para ter
          certeza de que ninguém já deu a baixa.
        </p>
        {feedback && (
          <p
            role="status"
            style={{
              margin: 0, padding: "0.6rem 0.8rem", borderRadius: 10, border: "1px solid",
              fontWeight: 700, fontSize: "0.9rem", ...FEEDBACK_STYLE[feedback.kind],
            }}
          >
            {feedback.text}
          </p>
        )}
      </div>

      <div style={s.totalsGrid}>
        <div style={{ ...s.totalBox, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
          <div style={{ ...s.totalNum, color: "#15803d" }}>{done}</div>
          <div style={{ ...s.totalLabel, color: "#166534" }}>Credenciados</div>
        </div>
        <div style={{ ...s.totalBox, background: "#fff7ed", borderColor: "#fed7aa" }}>
          <div style={{ ...s.totalNum, color: "#9a3412" }}>{missing}</div>
          <div style={{ ...s.totalLabel, color: "#9a3412" }}>Faltam chegar</div>
        </div>
        <div style={{ ...s.totalBox, background: "#eff6ff", borderColor: "#bfdbfe" }}>
          <div style={{ ...s.totalNum, color: "#1d4ed8" }}>{paid.length}</div>
          <div style={{ ...s.totalLabel, color: "#1d4ed8" }}>Total esperado</div>
        </div>
      </div>

      <input
        style={s.search}
        placeholder="🔍 Buscar por nome…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div style={s.chipsRow}>
        <label style={s.field}>
          Situação
          <select
            style={s.miniSelect}
            value={fSituacao}
            onChange={(e) => setFSituacao(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="pendente">A credenciar</option>
            <option value="feito">Já credenciados</option>
          </select>
        </label>
        <label style={s.field}>
          Perfil
          <select style={s.miniSelect} value={fPerfil} onChange={(e) => setFPerfil(e.target.value)}>
            <option value="">Todos</option>
            <option value="peregrino">Peregrinos</option>
            <option value="staff">Staff</option>
          </select>
        </label>
      </div>

      <p style={s.count}>
        {visible.length} pessoa(s)
        {visible.length > MAX_VISIBLE && ` · mostrando as ${MAX_VISIBLE} primeiras, refine a busca`}
      </p>

      <div style={s.grid}>
        {visible.slice(0, MAX_VISIBLE).map((r) => {
          const med = (r.allergy_medication_details || "").trim();
          const restr = (r.dietary_restriction_details || "").trim();
          const isDone = Boolean(r.checked_in_at);
          const isBusy = busyId === r.id;
          return (
            <div key={r.id} style={{ ...s.card, ...(isDone ? s.cardDone : {}) }}>
              <div style={s.cardName}>{formatName(r.name)}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.sleep_at_monastery === 1 ? (
                  <span style={tag("#b45309", "#fffbeb", "#fde68a")}>🏠 Pernoite</span>
                ) : (
                  <span style={tag("#374151", "#f3f4f6", "#e5e7eb")}>🚶 Sem pernoite</span>
                )}
                {r.is_staff === 1 && <span style={tag("#1f2937", "#f3f4f6", "#d1d5db")}>Staff</span>}
              </div>
              <div style={s.cardRow}>
                📍 {r.city || "—"} &nbsp;·&nbsp; 🎂 {formatDob(r.date_of_birth)}
              </div>
              <div style={s.cardRow}>📞 {r.phone || "—"}</div>
              {med && <div style={s.alertMed}>💊 Medicação: {med}</div>}
              {restr && <div style={s.alertRestr}>🍽️ Restrição: {restr}</div>}

              {isDone ? (
                <div style={s.doneBox}>
                  <span style={s.doneText}>
                    ✅ Credenciado às {formatCheckinTime(r.checked_in_at)} por{" "}
                    {shortEmail(r.checked_in_by)}
                  </span>
                  <button
                    type="button"
                    style={s.undoBtn}
                    onClick={() => handleAction(r, false)}
                    disabled={isBusy || loading}
                  >
                    {isBusy ? "…" : "Desfazer"}
                  </button>
                </div>
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

      {visible.length === 0 && <p style={s.empty}>Nenhuma pessoa encontrada.</p>}
    </>
  );
};

export default Credenciamento;
