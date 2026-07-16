import React from "react";
import { Link } from "react-router-dom";
import { isSuperAdmin } from "../../../utils/auth/superAdmin";

const STORAGE_KEY = "admin_jwt";

type InviteStatus = "available" | "link_copied" | "pending" | "used" | "revoked";

interface InviteCode {
  code: string;
  note: string | null;
  status: InviteStatus;
  used_by_name: string | null;
  used_at: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<InviteStatus, string> = {
  available: "Disponível",
  link_copied: "Link copiado",
  pending: "Em uso (não pago)",
  used: "Usado",
  revoked: "Revogado",
};

const STATUS_STYLE: Record<InviteStatus, React.CSSProperties> = {
  available: { color: "#15803d", background: "#f0fdf4", borderColor: "#86efac" },
  link_copied: { color: "#1d4ed8", background: "#eff6ff", borderColor: "#bfdbfe" },
  pending: { color: "#a16207", background: "#fefce8", borderColor: "#fde68a" },
  used: { color: "#1f2937", background: "#f3f4f6", borderColor: "#d1d5db" },
  revoked: { color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" },
};

type InviteFilter = "all" | InviteStatus;

const FILTERS: Array<{ key: InviteFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "available", label: "Disponível" },
  { key: "link_copied", label: "Link copiado" },
  { key: "pending", label: "Em uso" },
  { key: "used", label: "Usado" },
  { key: "revoked", label: "Revogado" },
];

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.4rem", margin: "0 0 0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.25rem", fontSize: "0.95rem", lineHeight: 1.5 },
  genBox: {
    border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem", background: "#fafafa",
    display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1.5rem",
  },
  field: { display: "inline-flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "#374151", fontWeight: 700 },
  input: { padding: "0.55rem 0.6rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.95rem" },
  genBtn: {
    padding: "0.6rem 1.2rem", borderRadius: 8, border: "none", background: "#1f7a3d", color: "#fff",
    fontWeight: 700, cursor: "pointer", fontSize: "0.95rem",
  },
  feedbackOk: { color: "#15803d", fontWeight: 600, margin: "0 0 0.75rem" },
  feedbackErr: { color: "#b91c1c", fontWeight: 600, margin: "0 0 0.75rem" },
  refresh: {
    marginLeft: "auto", padding: "0.55rem 1.1rem", borderRadius: 8, border: "1px solid #d1d5db",
    background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
  },
  topbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem", flexWrap: "wrap" },
  card: {
    border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.9rem 1rem", background: "#fff",
    display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 },
  codeText: { fontSize: "1.3rem", fontWeight: 800, letterSpacing: "0.15em", color: "#111827", fontFamily: "monospace" },
  linkRow: { display: "flex", gap: 6, alignItems: "center" },
  linkInput: {
    flex: 1, padding: "0.4rem 0.5rem", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: "0.78rem",
    color: "#4b5563", background: "#f9fafb",
  },
  copyBtn: {
    padding: "0.4rem 0.7rem", borderRadius: 6, border: "1px solid #1f7a3d", background: "#fff",
    color: "#1f7a3d", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem", whiteSpace: "nowrap",
  },
  revokeBtn: {
    padding: "0.4rem 0.7rem", borderRadius: 6, border: "1px solid #fecaca", background: "#fff",
    color: "#b91c1c", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem",
  },
  unrevokeBtn: {
    padding: "0.4rem 0.7rem", borderRadius: 6, border: "1px solid #86efac", background: "#fff",
    color: "#15803d", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem",
  },
  empty: { color: "#777", padding: "1rem 0" },
  filterBar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 0 1rem" },
  filterBtn: {
    padding: "0.4rem 0.9rem", borderRadius: 999, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
  },
  filterBtnActive: { background: "#1f7a3d", borderColor: "#1f7a3d", color: "#fff" },
};

const badge = (status: InviteStatus): React.CSSProperties => ({
  display: "inline-block", padding: "0.15rem 0.6rem", borderRadius: 999, fontWeight: 600,
  fontSize: "0.78rem", border: "1px solid", ...STATUS_STYLE[status],
});

const inviteLink = (code: string) => `${window.location.origin}/convite?convite=${code}`;

const ConvitesPage: React.FC = () => {
  const token = React.useMemo(() => localStorage.getItem(STORAGE_KEY), []);
  const superAdmin = React.useMemo(() => isSuperAdmin(), []);
  const [codes, setCodes] = React.useState<InviteCode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [count, setCount] = React.useState("1");
  const [note, setNote] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<InviteFilter>("all");

  const load = React.useCallback(() => {
    if (!token || !superAdmin) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/invite-codes?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setAuthError(true);
          return;
        }
        const data = (await res.json()) as { codes?: InviteCode[] };
        setCodes(data.codes ?? []);
      })
      .catch(() => setAuthError(true))
      .finally(() => setLoading(false));
  }, [token, superAdmin]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    if (!token) return;
    const n = Math.max(1, Math.min(50, parseInt(count, 10) || 1));
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create", count: n, note: note.trim() || undefined }),
      });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      if (!res.ok) throw new Error("create_failed");
      const data = (await res.json()) as { created?: Array<{ code: string }> };
      setFeedback({ ok: true, msg: `${data.created?.length ?? 0} código(s) gerado(s).` });
      setNote("");
      load();
    } catch {
      setFeedback({ ok: false, msg: "Erro ao gerar códigos." });
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (code: string) => {
    if (!token) return;
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "revoke", code }),
      });
      if (!res.ok) throw new Error("revoke_failed");
      setCodes((prev) => prev.map((c) => (c.code === code ? { ...c, status: "revoked" } : c)));
    } catch {
      setFeedback({ ok: false, msg: "Não foi possível revogar este código." });
    }
  };

  const handleUnrevoke = async (code: string) => {
    if (!token) return;
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "unrevoke", code }),
      });
      if (!res.ok) throw new Error("unrevoke_failed");
      // O status que volta (disponível / em uso / usado) depende do vínculo com a
      // inscrição, então recarrega a lista em vez de assumir "disponível".
      load();
    } catch {
      setFeedback({ ok: false, msg: "Não foi possível desrevogar este código." });
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(code));
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      /* clipboard indisponível */
    }
    // Registra a cópia (rastreabilidade) e reflete o status "Link copiado" na hora.
    // Só muda quem ainda está "Disponível" — não rebaixa usados/em uso/revogados.
    if (!token) return;
    setCodes((prev) =>
      prev.map((c) => (c.code === code && c.status === "available" ? { ...c, status: "link_copied" } : c))
    );
    try {
      await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "mark_copied", code }),
      });
    } catch {
      /* a marcação volta a valer no próximo "Atualizar" */
    }
  };

  if (token && !superAdmin) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Convites</h1>
        <p style={s.subtitle}>
          Esta área é restrita ao administrador geral. <Link to="/admin">Voltar</Link>.
        </p>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Convites</h1>
        <p style={s.subtitle}>
          Você precisa estar logado como admin. <Link to="/admin">Ir para o login</Link>.
        </p>
      </div>
    );
  }

  const counts: Record<InviteFilter, number> = {
    all: codes.length,
    available: codes.filter((c) => c.status === "available").length,
    link_copied: codes.filter((c) => c.status === "link_copied").length,
    pending: codes.filter((c) => c.status === "pending").length,
    used: codes.filter((c) => c.status === "used").length,
    revoked: codes.filter((c) => c.status === "revoked").length,
  };
  const visibleCodes = codes.filter((c) => filter === "all" || c.status === filter);

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <h1 style={s.title}>Convites — inscrições extras</h1>
        <button type="button" style={s.refresh} onClick={load} disabled={loading}>
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </div>
      <p style={s.subtitle}>
        Gere um código por pessoa e envie o link <strong>/convite</strong>. Mesmo com as 500 vagas
        esgotadas, quem tem código válido consegue se inscrever (sem pernoite). Cada código é de uso
        único — após a inscrição ser paga, fica indisponível. Você pode revogar um código não usado
        e, se precisar, desrevogá-lo depois para voltar a valer.
      </p>

      <div style={s.genBox}>
        <label style={s.field}>
          Quantos códigos
          <input
            style={{ ...s.input, width: 90 }}
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
        <label style={{ ...s.field, flex: "1 1 220px" }}>
          Observação (opcional — ex.: "família do Pe. João")
          <input
            style={s.input}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Para sua referência"
          />
        </label>
        <button type="button" style={s.genBtn} onClick={handleGenerate} disabled={generating}>
          {generating ? "Gerando…" : "Gerar códigos"}
        </button>
      </div>

      {feedback && <p style={feedback.ok ? s.feedbackOk : s.feedbackErr}>{feedback.msg}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : codes.length === 0 ? (
        <p style={s.empty}>Nenhum código gerado ainda.</p>
      ) : (
        <>
          <p style={s.subtitle}>
            {codes.length} código(s) — <strong>{counts.available + counts.link_copied}</strong> ainda livre(s)
            {" "}({counts.link_copied} com link copiado).
          </p>
          <div style={s.filterBar}>
            <span style={{ fontWeight: 700, color: "#374151", fontSize: "0.82rem" }}>Filtrar:</span>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                style={filter === f.key ? { ...s.filterBtn, ...s.filterBtnActive } : s.filterBtn}
                onClick={() => setFilter(f.key)}
              >
                {f.label} ({counts[f.key]})
              </button>
            ))}
          </div>
          {visibleCodes.length === 0 ? (
            <p style={s.empty}>Nenhum código nesse filtro.</p>
          ) : (
          <div style={s.grid}>
            {visibleCodes.map((c) => (
              <div key={c.code} style={s.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={s.codeText}>{c.code}</span>
                  <span style={badge(c.status)}>{STATUS_LABEL[c.status]}</span>
                </div>
                {c.note && <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>📝 {c.note}</div>}
                {c.used_by_name && (
                  <div style={{ fontSize: "0.85rem", color: "#374151" }}>👤 {c.used_by_name}</div>
                )}
                {(c.status === "available" || c.status === "link_copied" || c.status === "pending") && (
                  <>
                    <div style={s.linkRow}>
                      <input style={s.linkInput} readOnly value={inviteLink(c.code)} />
                      <button type="button" style={s.copyBtn} onClick={() => handleCopy(c.code)}>
                        {copiedCode === c.code ? "Copiado!" : "Copiar link"}
                      </button>
                    </div>
                    <button type="button" style={s.revokeBtn} onClick={() => handleRevoke(c.code)}>
                      Revogar
                    </button>
                  </>
                )}
                {c.status === "revoked" && (
                  <button type="button" style={s.unrevokeBtn} onClick={() => handleUnrevoke(c.code)}>
                    Desrevogar
                  </button>
                )}
              </div>
            ))}
          </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConvitesPage;
