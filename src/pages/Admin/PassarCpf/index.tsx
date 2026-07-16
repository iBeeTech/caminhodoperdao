import React from "react";
import { Link } from "react-router-dom";
import { isSuperAdmin } from "../../../utils/auth/superAdmin";

const STORAGE_KEY = "admin_jwt";

interface MissingCpfRow {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  is_staff: number;
}

type RowState = "idle" | "saving" | "saved" | "error";

const ERROR_LABEL: Record<string, string> = {
  invalid_cpf: "CPF inválido.",
  cpf_already_registered: "Este CPF já está cadastrado em outra inscrição.",
  cpf_encryption_not_configured: "Criptografia de CPF não configurada no servidor.",
  not_found: "Inscrição não encontrada.",
};

// Aplica a máscara 000.000.000-00 conforme o usuário digita.
const maskCpf = (raw: string): string => {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
};

const formatPhone = (phone: string | null): string => {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
};

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.5rem", marginBottom: "0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.5rem", fontSize: "0.95rem" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: { textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem", whiteSpace: "nowrap" },
  td: { borderBottom: "1px solid #eee", padding: "0.5rem", verticalAlign: "middle" },
  input: { padding: "0.4rem 0.55rem", borderRadius: 6, border: "1px solid #bbb", width: 150, fontSize: "0.9rem" },
  saveBtn: {
    padding: "0.45rem 1rem", borderRadius: 8, border: "none",
    background: "#1f7a3d", color: "#fff", fontWeight: 600, cursor: "pointer",
  },
  feedbackOk: { color: "#15803d", fontWeight: 600, fontSize: "0.85rem" },
  feedbackErr: { color: "#b91c1c", fontWeight: 600, fontSize: "0.85rem" },
  empty: { color: "#777", padding: "2rem 0" },
  tag: { fontSize: "0.7rem", fontWeight: 700, color: "#6b21a8", marginLeft: 6 },
};

const PassarCpfPage: React.FC = () => {
  const [token] = React.useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [rows, setRows] = React.useState<MissingCpfRow[]>([]);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [rowState, setRowState] = React.useState<Record<string, RowState>>({});
  const [rowError, setRowError] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const superAdmin = React.useMemo(() => isSuperAdmin(), []);

  const load = React.useCallback(async () => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    if (!superAdmin) {
      // A área é restrita ao admin geral; o render trata o aviso.
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/set-cpf", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      const data = (await res.json()) as { registrations?: MissingCpfRow[] };
      setRows(data.registrations ?? []);
    } catch {
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }, [token, superAdmin]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleChange = (id: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: maskCpf(value) }));
    setRowState((prev) => ({ ...prev, [id]: "idle" }));
    setRowError((prev) => ({ ...prev, [id]: "" }));
  };

  const handleSave = async (id: string) => {
    if (!token) return;
    const cpf = drafts[id] ?? "";
    if (cpf.replace(/\D/g, "").length !== 11) {
      setRowState((prev) => ({ ...prev, [id]: "error" }));
      setRowError((prev) => ({ ...prev, [id]: "Digite os 11 dígitos do CPF." }));
      return;
    }
    setRowState((prev) => ({ ...prev, [id]: "saving" }));
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch("/api/admin/set-cpf", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, cpf }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const label = (data.error && ERROR_LABEL[data.error]) || "Erro ao salvar.";
        setRowState((prev) => ({ ...prev, [id]: "error" }));
        setRowError((prev) => ({ ...prev, [id]: label }));
        return;
      }
      setRowState((prev) => ({ ...prev, [id]: "saved" }));
      // Some a linha da lista após salvar (já tem CPF).
      setTimeout(() => {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }, 800);
    } catch {
      setRowState((prev) => ({ ...prev, [id]: "error" }));
      setRowError((prev) => ({ ...prev, [id]: "Erro de conexão." }));
    }
  };

  if (token && !superAdmin) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Passar CPF</h1>
        <p style={styles.subtitle}>
          Esta área é restrita ao administrador geral. <Link to="/admin">Voltar</Link>.
        </p>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Passar CPF</h1>
        <p style={styles.subtitle}>
          Você precisa estar logado como admin. <Link to="/admin">Ir para o login</Link>.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Passar CPF</h1>
      <p style={styles.subtitle}>
        Inscritos que estão sem CPF cadastrado. Digite o CPF e clique em Salvar — ele é
        criptografado no servidor e a pessoa some desta lista.
      </p>

      {loading ? (
        <p>Carregando…</p>
      ) : rows.length === 0 ? (
        <p style={styles.empty}>Todo mundo já está com CPF cadastrado. 🎉</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>Telefone</th>
              <th style={styles.th}>CPF</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const state = rowState[r.id] ?? "idle";
              return (
                <tr key={r.id}>
                  <td style={styles.td}>
                    {r.name || "—"}
                    {r.is_staff === 1 && <span style={styles.tag}>STAFF</span>}
                  </td>
                  <td style={styles.td}>{formatPhone(r.phone)}</td>
                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={drafts[r.id] ?? ""}
                      onChange={(e) => handleChange(r.id, e.target.value)}
                      disabled={state === "saving" || state === "saved"}
                    />
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.saveBtn}
                      onClick={() => handleSave(r.id)}
                      disabled={state === "saving" || state === "saved"}
                    >
                      {state === "saving" ? "Salvando…" : state === "saved" ? "Salvo ✓" : "Salvar"}
                    </button>
                    {state === "error" && rowError[r.id] && (
                      <div style={styles.feedbackErr}>{rowError[r.id]}</div>
                    )}
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

export default PassarCpfPage;
