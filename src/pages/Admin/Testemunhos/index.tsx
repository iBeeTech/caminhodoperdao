import React from "react";
import AuthNotice from "../AuthNotice";

const STORAGE_KEY = "admin_jwt";

type TestimonyStatus = "pending" | "approved" | "rejected";

interface AdminTestimony {
  id: string;
  name: string;
  content: string;
  source: "text" | "audio";
  audio_url: string | null;
  status: TestimonyStatus;
  created_at: string;
}

// created_at vem do SQLite em UTC ("YYYY-MM-DD HH:MM:SS"); exibe no fuso local.
const formatDate = (value: string) => {
  if (!value) return "—";
  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabel: Record<TestimonyStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const statusStyle: Record<TestimonyStatus, React.CSSProperties> = {
  pending: { color: "#a16207", borderColor: "#fde68a", background: "#fefce8" },
  approved: { color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" },
  rejected: { color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" },
};

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.5rem", marginBottom: "0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.5rem", fontSize: "0.95rem" },
  filters: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" },
  filterBtn: {
    padding: "0.4rem 1rem", borderRadius: 999, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
  },
  filterBtnActive: {
    padding: "0.4rem 1rem", borderRadius: 999, border: "1px solid #1f7a3d", background: "#1f7a3d",
    color: "#fff", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
  },
  card: {
    border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem",
    background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  cardHead: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" },
  name: { fontWeight: 700, fontSize: "1rem" },
  badge: {
    padding: "0.15rem 0.6rem", borderRadius: 999, fontWeight: 700, fontSize: "0.75rem",
    border: "1px solid", whiteSpace: "nowrap",
  },
  audioBadge: {
    padding: "0.15rem 0.6rem", borderRadius: 999, fontWeight: 700, fontSize: "0.75rem",
    border: "1px solid #c7d2fe", color: "#1d2c5e", background: "#eef2ff",
  },
  date: { marginLeft: "auto", color: "#6b7280", fontSize: "0.82rem" },
  content: { margin: "0 0 0.9rem 0", lineHeight: 1.6, color: "#111827", whiteSpace: "pre-wrap" },
  audio: { width: "100%", marginBottom: "0.9rem" },
  actions: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  approve: {
    padding: "0.45rem 1.1rem", borderRadius: 8, border: "none", background: "#1f7a3d",
    color: "#fff", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
  },
  reject: {
    padding: "0.45rem 1.1rem", borderRadius: 8, border: "1px solid #b91c1c", background: "#fff",
    color: "#b91c1c", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
  },
  pendingBtn: {
    padding: "0.45rem 1.1rem", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
  },
  empty: { color: "#777", padding: "2rem 0" },
  error: { color: "#b91c1c", fontWeight: 600 },
};

type Filter = "pending" | "approved" | "rejected" | "all";

const AdminTestemunhos: React.FC = () => {
  const [token] = React.useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [items, setItems] = React.useState<AdminTestimony[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>("pending");

  const load = React.useCallback(async () => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/testemunhos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      const data = (await res.json()) as { testimonies?: AdminTestimony[] };
      setItems(data.testimonies ?? []);
    } catch {
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (entry: AdminTestimony, status: TestimonyStatus) => {
    if (!token) return;
    setSavingId(entry.id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/testemunhos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: entry.id, status }),
      });
      if (!res.ok) throw new Error("save_failed");
      setItems((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status } : e)));
    } catch {
      setActionError("Erro ao salvar. Tente novamente.");
    } finally {
      setSavingId(null);
    }
  };

  if (authError) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Testemunhos</h1>
        <AuthNotice />
      </div>
    );
  }

  const counts = {
    pending: items.filter((i) => i.status === "pending").length,
    approved: items.filter((i) => i.status === "approved").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    all: items.length,
  };

  const visible = filter === "all" ? items : items.filter((i) => i.status === filter);

  const filterButton = (key: Filter, label: string) => (
    <button
      type="button"
      style={filter === key ? styles.filterBtnActive : styles.filterBtn}
      onClick={() => setFilter(key)}
    >
      {label} ({counts[key]})
    </button>
  );

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Testemunhos</h1>
      <p style={styles.subtitle}>
        Graças e milagres enviados pelo público (texto ou áudio). Aprove para que apareçam
        na página pública de testemunhos.
      </p>

      <div style={styles.filters}>
        {filterButton("pending", "Pendentes")}
        {filterButton("approved", "Aprovados")}
        {filterButton("rejected", "Rejeitados")}
        {filterButton("all", "Todos")}
      </div>

      {actionError && <p style={styles.error}>{actionError}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : visible.length === 0 ? (
        <p style={styles.empty}>Nenhum testemunho nesta categoria.</p>
      ) : (
        visible.map((entry) => (
          <div key={entry.id} style={styles.card}>
            <div style={styles.cardHead}>
              <span style={styles.name}>{entry.name}</span>
              {entry.source === "audio" && <span style={styles.audioBadge}>🎙️ Áudio</span>}
              <span style={{ ...styles.badge, ...statusStyle[entry.status] }}>
                {statusLabel[entry.status]}
              </span>
              <span style={styles.date}>{formatDate(entry.created_at)}</span>
            </div>

            <p style={styles.content}>{entry.content}</p>

            {entry.audio_url && (
              <audio style={styles.audio} controls src={entry.audio_url}>
                <track kind="captions" />
              </audio>
            )}

            <div style={styles.actions}>
              {entry.status !== "approved" && (
                <button
                  type="button"
                  style={styles.approve}
                  onClick={() => updateStatus(entry, "approved")}
                  disabled={savingId === entry.id}
                >
                  Aprovar
                </button>
              )}
              {entry.status !== "rejected" && (
                <button
                  type="button"
                  style={styles.reject}
                  onClick={() => updateStatus(entry, "rejected")}
                  disabled={savingId === entry.id}
                >
                  Rejeitar
                </button>
              )}
              {entry.status !== "pending" && (
                <button
                  type="button"
                  style={styles.pendingBtn}
                  onClick={() => updateStatus(entry, "pending")}
                  disabled={savingId === entry.id}
                >
                  Voltar a pendente
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminTestemunhos;
