import React from "react";
import { Link } from "react-router-dom";
import AdminNav from "../AdminNav";

const STORAGE_KEY = "admin_jwt";

interface WaitlistEntry {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  notified_at: string | null;
  created_at: string;
}

const formatCpf = (cpf: string) =>
  cpf.length === 11 ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}` : cpf;

const formatPhone = (digits: string) => {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
};

// created_at vem do SQLite em UTC ("YYYY-MM-DD HH:MM:SS"); exibe no fuso local.
const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Mensagem pronta do aviso de vaga aberta (1 clique abre o WhatsApp com ela).
const buildWhatsappUrl = (entry: WaitlistEntry) => {
  const firstName = entry.name.trim().split(/\s+/)[0] || entry.name;
  const message =
    `Olá, ${firstName}! Aqui é da organização do Caminho do Perdão. ` +
    `Você está na nossa lista de espera e uma vaga foi liberada! ` +
    `Você pode fazer a inscrição pelo link:`;
  return `https://wa.me/55${entry.phone}?text=${encodeURIComponent(message)}`;
};

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.5rem", marginBottom: "0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.5rem", fontSize: "0.95rem" },
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
  badge: { padding: "0.2rem 0.6rem", borderRadius: 999, fontWeight: 700, fontSize: "0.78rem", border: "1px solid", whiteSpace: "nowrap" },
  empty: { color: "#777", padding: "2rem 0" },
  error: { color: "#b91c1c", fontWeight: 600 },
};

const ListaEsperaPage: React.FC = () => {
  const [token] = React.useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [entries, setEntries] = React.useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/waitlist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      const data = (await res.json()) as { waitlist?: WaitlistEntry[] };
      setEntries(data.waitlist ?? []);
    } catch {
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const setNotified = async (entry: WaitlistEntry, notified: boolean) => {
    if (!token) return;
    setSavingId(entry.id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates: [{ id: entry.id, notified }] }),
      });
      if (!res.ok) throw new Error("save_failed");
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, notified_at: notified ? new Date().toISOString() : null } : e
        )
      );
    } catch {
      setActionError("Erro ao salvar. Tente novamente.");
    } finally {
      setSavingId(null);
    }
  };

  // Baixa a planilha .xlsx da fila (mesmo fluxo dos relatórios do /admin).
  const handleDownload = async () => {
    if (!token) return;
    setActionError(null);
    try {
      const res = await fetch("/api/admin/reports/lista-espera", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("download_failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "lista-espera.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setActionError("Erro ao baixar a planilha. Tente novamente.");
    }
  };

  // Abre o WhatsApp com a mensagem pronta e já marca como avisado.
  const handleNotify = (entry: WaitlistEntry) => {
    window.open(buildWhatsappUrl(entry), "_blank", "noopener,noreferrer");
    if (!entry.notified_at) {
      setNotified(entry, true);
    }
  };

  if (authError) {
    return (
      <div style={styles.page}>
        <AdminNav />
        <h1 style={styles.title}>Lista de espera</h1>
        <p style={styles.subtitle}>
          Você precisa estar logado como admin. <Link to="/admin">Ir para o login</Link>.
        </p>
      </div>
    );
  }

  const waiting = entries.filter((e) => !e.notified_at).length;
  const notified = entries.length - waiting;

  return (
    <div style={styles.page}>
      <AdminNav />
      <h1 style={styles.title}>Lista de espera</h1>
      <p style={styles.subtitle}>
        Pessoas aguardando vaga, em ordem de entrada. Quando abrir vaga, clique em
        "Avisar no WhatsApp": a mensagem abre pronta e a pessoa é marcada como avisada.
      </p>

      <div style={styles.counters}>
        <span style={{ ...styles.counter, color: "#1d2c5e", borderColor: "#c7d2fe", background: "#eef2ff" }}>
          Total: {entries.length}
        </span>
        <span style={{ ...styles.counter, color: "#a16207", borderColor: "#fde68a", background: "#fefce8" }}>
          Aguardando: {waiting}
        </span>
        <span style={{ ...styles.counter, color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" }}>
          Avisados: {notified}
        </span>
        <button
          type="button"
          style={{ ...styles.toggleBtn, marginLeft: "auto" }}
          onClick={handleDownload}
          disabled={loading || entries.length === 0}
        >
          Baixar planilha (.xlsx)
        </button>
      </div>

      {actionError && <p style={styles.error}>{actionError}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : entries.length === 0 ? (
        <p style={styles.empty}>Ninguém na lista de espera ainda.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>CPF</th>
              <th style={styles.th}>WhatsApp</th>
              <th style={styles.th}>Entrou em</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id} style={entry.notified_at ? { background: "#f8fafc" } : undefined}>
                <td style={styles.td}>{index + 1}º</td>
                <td style={styles.td}>{entry.name || "—"}</td>
                <td style={styles.td}>{entry.cpf ? formatCpf(entry.cpf) : "—"}</td>
                <td style={styles.td}>{formatPhone(entry.phone)}</td>
                <td style={styles.td}>{formatDate(entry.created_at)}</td>
                <td style={styles.td}>
                  {entry.notified_at ? (
                    <span style={{ ...styles.badge, color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" }}>
                      Avisado
                    </span>
                  ) : (
                    <span style={{ ...styles.badge, color: "#a16207", borderColor: "#fde68a", background: "#fefce8" }}>
                      Aguardando
                    </span>
                  )}
                </td>
                <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    style={styles.waBtn}
                    onClick={() => handleNotify(entry)}
                    disabled={savingId === entry.id}
                  >
                    Avisar no WhatsApp
                  </button>
                  <button
                    type="button"
                    style={styles.toggleBtn}
                    onClick={() => setNotified(entry, !entry.notified_at)}
                    disabled={savingId === entry.id}
                  >
                    {entry.notified_at ? "Desfazer aviso" : "Marcar avisado"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ListaEsperaPage;
