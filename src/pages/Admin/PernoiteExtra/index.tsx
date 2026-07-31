import React from "react";
import AuthNotice from "../AuthNotice";

const STORAGE_KEY = "admin_jwt";

interface Person {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  is_staff: number;
  pernoite_granted: number;
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.4rem", margin: "0 0 0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.25rem", fontSize: "0.95rem", lineHeight: 1.5 },
  topbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem", flexWrap: "wrap" },
  refresh: {
    marginLeft: "auto", padding: "0.55rem 1.1rem", borderRadius: 8, border: "none",
    background: "#1f7a3d", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
  },
  search: {
    width: "100%", boxSizing: "border-box", padding: "0.75rem 0.9rem", borderRadius: 10,
    border: "1px solid #d1d5db", fontSize: "1rem", marginBottom: "1rem",
  },
  sectionTitle: { fontSize: "1.05rem", fontWeight: 800, color: "#111827", margin: "1.5rem 0 0.5rem" },
  count: { color: "#6b7280", fontSize: "0.85rem", margin: "0 0 0.6rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12 },
  card: {
    border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.9rem 1rem", background: "#fff",
    display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  cardGranted: { borderColor: "#c4b5fd", background: "#faf5ff" },
  cardName: { fontSize: "1.05rem", fontWeight: 700, color: "#111827", lineHeight: 1.25 },
  cardRow: { fontSize: "0.88rem", color: "#374151" },
  cardEmail: { fontSize: "0.8rem", color: "#6b7280", wordBreak: "break-all" },
  grantBtn: {
    marginTop: 6, padding: "0.55rem 1rem", borderRadius: 8, border: "none",
    background: "#6d28d9", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
  },
  revokeBtn: {
    marginTop: 6, padding: "0.55rem 1rem", borderRadius: 8, border: "1px solid #fecaca",
    background: "#fff", color: "#b91c1c", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
  },
  empty: { color: "#777", padding: "1rem 0" },
  feedbackOk: { color: "#15803d", fontWeight: 600, marginBottom: "0.75rem" },
  feedbackErr: { color: "#b91c1c", fontWeight: 600, marginBottom: "0.75rem" },
};

const tag = (color: string, bg: string, border: string): React.CSSProperties => ({
  display: "inline-block", padding: "0.15rem 0.6rem", borderRadius: 999, fontWeight: 600,
  fontSize: "0.78rem", border: `1px solid ${border}`, color, background: bg,
});

const LOWER = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "del", "della", "van", "von", "y"]);
const formatName = (raw: string | null | undefined): string => {
  const v = (raw ?? "").trim();
  if (!v) return "—";
  return v
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && LOWER.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
};

const inc = (v: string | null | undefined, q: string) =>
  (v ?? "").toLowerCase().includes(q.trim().toLowerCase());

const byName = (a: Person, b: Person) =>
  (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" });

const PernoiteExtraPage: React.FC = () => {
  const token = React.useMemo(() => localStorage.getItem(STORAGE_KEY), []);
  const [candidates, setCandidates] = React.useState<Person[]>([]);
  const [granted, setGranted] = React.useState<Person[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const [query, setQuery] = React.useState("");

  const load = React.useCallback(() => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/grant-pernoite?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setAuthError(true);
          return;
        }
        const data = (await res.json()) as { candidates?: Person[]; granted?: Person[] };
        setCandidates(data.candidates ?? []);
        setGranted(data.granted ?? []);
      })
      .catch(() => setAuthError(true))
      .finally(() => setLoading(false));
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const act = async (person: Person, grant: boolean) => {
    if (!token) return;
    setBusyId(person.id);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/grant-pernoite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: person.id, grant }),
      });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      if (!res.ok) throw new Error("request_failed");
      // Move a pessoa entre as listas localmente, sem recarregar tudo.
      if (grant) {
        setCandidates((prev) => prev.filter((p) => p.id !== person.id));
        setGranted((prev) => [...prev, { ...person, pernoite_granted: 1 }].sort(byName));
        setFeedback({ ok: true, msg: `Pernoite concedida a ${formatName(person.name)}.` });
      } else {
        setGranted((prev) => prev.filter((p) => p.id !== person.id));
        setCandidates((prev) => [...prev, { ...person, pernoite_granted: 0 }].sort(byName));
        setFeedback({ ok: true, msg: `Pernoite de ${formatName(person.name)} revogada.` });
      }
    } catch {
      setFeedback({ ok: false, msg: "Não foi possível salvar. Tente novamente." });
    } finally {
      setBusyId(null);
    }
  };

  if (authError) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Pernoite extra</h1>
        <AuthNotice />
      </div>
    );
  }

  const candidatesFiltered = candidates.filter((p) => inc(p.name, query)).sort(byName);
  const grantedFiltered = granted.filter((p) => inc(p.name, query)).sort(byName);

  const StaffTag = ({ p }: { p: Person }) =>
    p.is_staff === 1 ? <span style={tag("#1f2937", "#f3f4f6", "#d1d5db")}>Staff</span> : null;

  return (
    <div style={s.page}>

      <div style={s.topbar}>
        <h1 style={s.title}>Pernoite extra</h1>
        <button type="button" style={s.refresh} onClick={load} disabled={loading}>
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </div>
      <p style={s.subtitle}>
        Conceda pernoite a quem se inscreveu como <strong>geral</strong> (pagou, mas sem pernoite) e
        foi autorizado a dormir no mosteiro. A pessoa passa a contar como pernoite, entra na planilha
        de organização dos quartos e aparece marcada como <strong>Pernoite Concedida</strong> em
        Inscritos. Você pode revogar a qualquer momento.
      </p>

      {feedback && <p style={feedback.ok ? s.feedbackOk : s.feedbackErr}>{feedback.msg}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : (
        <>
          <input
            style={s.search}
            placeholder="🔍 Buscar por nome…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <h2 style={s.sectionTitle}>🌙 Pernoite concedida ({grantedFiltered.length})</h2>
          {grantedFiltered.length === 0 ? (
            <p style={s.empty}>Ninguém com pernoite concedida ainda.</p>
          ) : (
            <div style={s.grid}>
              {grantedFiltered.map((p) => (
                <div key={p.id} style={{ ...s.card, ...s.cardGranted }}>
                  <div style={s.cardName}>{formatName(p.name)}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={tag("#6d28d9", "#f5f3ff", "#ddd6fe")}>🌙 Pernoite Concedida</span>
                    <StaffTag p={p} />
                  </div>
                  <div style={s.cardRow}>📞 {p.phone || "—"}</div>
                  <div style={s.cardRow}>📍 {p.city || "—"}</div>
                  <div style={s.cardEmail}>{p.email || "—"}</div>
                  <button
                    type="button"
                    style={s.revokeBtn}
                    disabled={busyId === p.id}
                    onClick={() => act(p, false)}
                  >
                    {busyId === p.id ? "Revogando…" : "Revogar pernoite"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <h2 style={s.sectionTitle}>Inscritos geral pagos ({candidatesFiltered.length})</h2>
          <p style={s.count}>Selecione quem foi autorizado a dormir no mosteiro.</p>
          {candidatesFiltered.length === 0 ? (
            <p style={s.empty}>Nenhum inscrito geral pago disponível.</p>
          ) : (
            <div style={s.grid}>
              {candidatesFiltered.map((p) => (
                <div key={p.id} style={s.card}>
                  <div style={s.cardName}>{formatName(p.name)}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={tag("#374151", "#f3f4f6", "#e5e7eb")}>🚶 Geral</span>
                    <StaffTag p={p} />
                  </div>
                  <div style={s.cardRow}>📞 {p.phone || "—"}</div>
                  <div style={s.cardRow}>📍 {p.city || "—"}</div>
                  <div style={s.cardEmail}>{p.email || "—"}</div>
                  <button
                    type="button"
                    style={s.grantBtn}
                    disabled={busyId === p.id}
                    onClick={() => act(p, true)}
                  >
                    {busyId === p.id ? "Concedendo…" : "Conceder pernoite"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PernoiteExtraPage;
