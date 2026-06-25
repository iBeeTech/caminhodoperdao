import React from "react";
import { Link } from "react-router-dom";
import AdminNav from "../AdminNav";

const STORAGE_KEY = "admin_jwt";

// Link do grupo do WhatsApp e mensagem fixa enviada a cada inscrito pago.
const GROUP_LINK = "https://chat.whatsapp.com/FBuIFntCDpxGceChM6zNNa";
const GROUP_MESSAGE =
  "Você está inscrito no Caminho do Perdão, se já está no nosso grupo de WhatsApp, " +
  "desconsidere essa mensagem. Se ainda não está, entre para o nosso grupo de WhatsApp " +
  `pelo link: ${GROUP_LINK}`;

interface Registration {
  id: string;
  name: string;
  phone: string;
  group_invited_at: string | null;
  group_invite_failed_at: string | null;
}

type InviteStatus = "waiting" | "invited" | "failed";
type InviteFilter = "all" | InviteStatus;

const statusOf = (r: Registration): InviteStatus => {
  if (r.group_invited_at) return "invited";
  if (r.group_invite_failed_at) return "failed";
  return "waiting";
};

const FILTERS: Array<{ key: InviteFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "waiting", label: "Aguardando" },
  { key: "invited", label: "Convidado" },
  { key: "failed", label: "Não consegui convidar" },
];

const formatPhone = (digits: string) => {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
};

// Abre o WhatsApp já com a mensagem do grupo pronta para enviar.
const buildWhatsappUrl = (r: Registration) =>
  `https://wa.me/55${r.phone}?text=${encodeURIComponent(GROUP_MESSAGE)}`;

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.5rem", marginBottom: "0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.5rem", fontSize: "0.95rem", lineHeight: 1.5 },
  counters: { display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" },
  counter: {
    padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid", fontWeight: 600, fontSize: "0.9rem",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: { textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem", whiteSpace: "nowrap" },
  td: { borderBottom: "1px solid #eee", padding: "0.5rem", verticalAlign: "middle" },
  waBtn: {
    display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem",
    borderRadius: 8, border: "none", background: "#25d366", color: "#fff", fontWeight: 600,
    fontSize: "0.85rem", cursor: "pointer", textDecoration: "none",
  },
  toggleBtn: {
    padding: "0.4rem 0.8rem", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", marginLeft: "0.5rem",
  },
  failBtn: {
    padding: "0.4rem 0.8rem", borderRadius: 8, border: "1px solid #fecaca", background: "#fff",
    color: "#b91c1c", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", marginLeft: "0.5rem",
  },
  filterBar: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" },
  filterBtn: {
    padding: "0.4rem 0.9rem", borderRadius: 999, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
  },
  filterBtnActive: { background: "#1d2c5e", borderColor: "#1d2c5e", color: "#fff" },
  badge: { padding: "0.2rem 0.6rem", borderRadius: 999, fontWeight: 700, fontSize: "0.78rem", border: "1px solid", whiteSpace: "nowrap" },
  empty: { color: "#777", padding: "2rem 0" },
  error: { color: "#b91c1c", fontWeight: 600 },
};

const ConvidarGrupoPage: React.FC = () => {
  const [token] = React.useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [entries, setEntries] = React.useState<Registration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<InviteFilter>("all");

  const load = React.useCallback(async () => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/group-invite", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      const data = (await res.json()) as { registrations?: Registration[] };
      setEntries(data.registrations ?? []);
    } catch {
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const setInvited = async (entry: Registration, invited: boolean) => {
    if (!token) return;
    setSavingId(entry.id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/group-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates: [{ id: entry.id, invited }] }),
      });
      if (!res.ok) throw new Error("save_failed");
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                group_invited_at: invited ? new Date().toISOString() : null,
                // Convidar com sucesso limpa o "não consegui" (espelha o backend).
                group_invite_failed_at: invited ? null : e.group_invite_failed_at,
              }
            : e
        )
      );
    } catch {
      setActionError("Erro ao salvar. Tente novamente.");
    } finally {
      setSavingId(null);
    }
  };

  // Marca/desmarca "não consegui convidar".
  const setInviteFailed = async (entry: Registration, failed: boolean) => {
    if (!token) return;
    setSavingId(entry.id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/group-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates: [{ id: entry.id, inviteFailed: failed }] }),
      });
      if (!res.ok) throw new Error("save_failed");
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                group_invite_failed_at: failed ? new Date().toISOString() : null,
                // "Não consegui" e "convidado" são mutuamente exclusivos (espelha o backend).
                group_invited_at: failed ? null : e.group_invited_at,
              }
            : e
        )
      );
    } catch {
      setActionError("Erro ao salvar. Tente novamente.");
    } finally {
      setSavingId(null);
    }
  };

  // Abre o WhatsApp com a mensagem do grupo e já marca como convidado.
  const handleInvite = (entry: Registration) => {
    window.open(buildWhatsappUrl(entry), "_blank", "noopener,noreferrer");
    if (!entry.group_invited_at) {
      setInvited(entry, true);
    }
  };

  if (authError) {
    return (
      <div style={styles.page}>
        <AdminNav />
        <h1 style={styles.title}>Convidar para Grupo WP</h1>
        <p style={styles.subtitle}>
          Você precisa estar logado como admin. <Link to="/admin">Ir para o login</Link>.
        </p>
      </div>
    );
  }

  const invited = entries.filter((e) => statusOf(e) === "invited").length;
  const failed = entries.filter((e) => statusOf(e) === "failed").length;
  const waiting = entries.length - invited - failed;
  const counts: Record<InviteFilter, number> = {
    all: entries.length,
    waiting,
    invited,
    failed,
  };

  const visible = entries.filter((entry) => filter === "all" || statusOf(entry) === filter);

  return (
    <div style={styles.page}>
      <AdminNav />
      <h1 style={styles.title}>Convidar para Grupo WP</h1>
      <p style={styles.subtitle}>
        Inscritos pagos, em ordem alfabética. Clique em "Convidar no WhatsApp": a mensagem com o
        link do grupo abre pronta e a pessoa é marcada como convidada. Use "Não consegui convidar"
        para quem o número não funcionou.
      </p>

      <div style={styles.counters}>
        <span style={{ ...styles.counter, color: "#1d2c5e", borderColor: "#c7d2fe", background: "#eef2ff" }}>
          Total: {entries.length}
        </span>
        <span style={{ ...styles.counter, color: "#a16207", borderColor: "#fde68a", background: "#fefce8" }}>
          Aguardando: {waiting}
        </span>
        <span style={{ ...styles.counter, color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" }}>
          Convidados: {invited}
        </span>
        <span style={{ ...styles.counter, color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" }}>
          Não consegui convidar: {failed}
        </span>
      </div>

      <div style={styles.filterBar}>
        <span style={{ fontWeight: 600, color: "#374151", fontSize: "0.85rem" }}>Filtrar:</span>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            style={filter === f.key ? { ...styles.filterBtn, ...styles.filterBtnActive } : styles.filterBtn}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {actionError && <p style={styles.error}>{actionError}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : entries.length === 0 ? (
        <p style={styles.empty}>Nenhum inscrito pago com telefone.</p>
      ) : visible.length === 0 ? (
        <p style={styles.empty}>Ninguém nesse filtro.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>WhatsApp</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => {
              const status = statusOf(entry);
              return (
                <tr key={entry.id} style={status !== "waiting" ? { background: "#f8fafc" } : undefined}>
                  <td style={styles.td}>{entry.name || "—"}</td>
                  <td style={styles.td}>{formatPhone(entry.phone)}</td>
                  <td style={styles.td}>
                    {status === "invited" && (
                      <span style={{ ...styles.badge, color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" }}>
                        Convidado
                      </span>
                    )}
                    {status === "failed" && (
                      <span style={{ ...styles.badge, color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" }}>
                        Não consegui convidar
                      </span>
                    )}
                    {status === "waiting" && (
                      <span style={{ ...styles.badge, color: "#a16207", borderColor: "#fde68a", background: "#fefce8" }}>
                        Aguardando
                      </span>
                    )}
                  </td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      style={styles.waBtn}
                      onClick={() => handleInvite(entry)}
                      disabled={savingId === entry.id}
                    >
                      Convidar no WhatsApp
                    </button>
                    <button
                      type="button"
                      style={styles.toggleBtn}
                      onClick={() => setInvited(entry, !entry.group_invited_at)}
                      disabled={savingId === entry.id}
                    >
                      {entry.group_invited_at ? "Desfazer convite" : "Marcar convidado"}
                    </button>
                    <button
                      type="button"
                      style={styles.failBtn}
                      onClick={() => setInviteFailed(entry, status !== "failed")}
                      disabled={savingId === entry.id}
                    >
                      {status === "failed" ? "Desfazer" : "Não consegui convidar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ConvidarGrupoPage;
