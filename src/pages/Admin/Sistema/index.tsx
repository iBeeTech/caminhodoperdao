import React from "react";
import AuthNotice from "../AuthNotice";

/**
 * `/admin/sistema` — a chave das inscrições e a lista de exceção.
 *
 * A tela fala em **abertas** e **encerradas**, nunca em "flag true/false". A
 * flag por baixo é a `enrollment`, que já existia (migration 002) e cuja
 * polaridade é `1 = abertas`. Obrigar quem usa a tela a lembrar disso é
 * convidar ao erro exatamente na alavanca que tranca o site.
 *
 * ⚠️ **Encerrar tranca gente de dentro.** Com as inscrições encerradas
 * ninguém cria conta nem entra — inclusive quem já se inscreveu e só queria
 * ver a própria inscrição. A tela diz isso antes de o botão ser apertado, e a
 * confirmação existe para o clique não ser reflexo.
 *
 * A lista de exceção é a fresta: os e-mails dela entram mesmo com tudo
 * fechado. Serve para a organização testar, para o admin conferir uma
 * inscrição e para o caso combinado por fora.
 */

const STORAGE_KEY = "admin_jwt";

interface BypassEntry {
  email: string;
  note: string | null;
  created_at: number;
  created_by: string | null;
}

interface EnrollmentState {
  enrollmentOpen: boolean;
  bypass: BypassEntry[];
}

const formatDate = (epochMs: number) => {
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.5rem", marginBottom: "0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.75rem", fontSize: "0.95rem", lineHeight: 1.6 },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "18px 20px",
    background: "#fff",
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
    marginBottom: 22,
  },
  cardTitle: { fontSize: "1.05rem", fontWeight: 800, color: "#1d2c5e", margin: "0 0 6px" },
  cardHelp: { color: "#6b7280", fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 14px" },
  stateRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  badge: {
    padding: "0.35rem 0.9rem",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: "0.9rem",
    border: "1px solid",
  },
  open: { color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" },
  closed: { color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" },
  warnBox: {
    marginTop: 14,
    padding: "12px 14px",
    borderRadius: 10,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    fontSize: "0.88rem",
    lineHeight: 1.6,
  },
  primaryBtn: {
    padding: "0.6rem 1.1rem",
    borderRadius: 10,
    border: "none",
    background: "#1d2c5e",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.92rem",
    cursor: "pointer",
  },
  dangerBtn: {
    padding: "0.6rem 1.1rem",
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    fontWeight: 700,
    fontSize: "0.92rem",
    cursor: "pointer",
  },
  ghostBtn: {
    padding: "0.45rem 0.8rem",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    fontWeight: 600,
    fontSize: "0.82rem",
    cursor: "pointer",
  },
  btnOff: { opacity: 0.55, cursor: "not-allowed" },
  form: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 },
  field: { display: "flex", flexDirection: "column", gap: 5, flex: "1 1 220px" },
  label: { fontWeight: 700, fontSize: "0.8rem", color: "#374151" },
  input: {
    padding: "0.55rem 0.7rem",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: "0.92rem",
    boxSizing: "border-box",
    width: "100%",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th: { textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem", whiteSpace: "nowrap" },
  td: { borderBottom: "1px solid #eee", padding: "0.5rem", verticalAlign: "middle" },
  empty: { color: "#777", padding: "1.25rem 0", fontSize: "0.9rem" },
  error: { color: "#b91c1c", fontWeight: 600, marginTop: 12 },
};

const AdminSistema: React.FC = () => {
  const [token] = React.useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [state, setState] = React.useState<EnrollmentState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);
  const [isConfirmingClose, setIsConfirmingClose] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [newNote, setNewNote] = React.useState("");

  const load = React.useCallback(async () => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/enrollment", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      setState((await res.json()) as EnrollmentState);
    } catch {
      setActionError("Não foi possível carregar. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const send = async (body: Record<string, unknown>) => {
    if (!token) return;
    setIsBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as EnrollmentState & { error?: string };
      if (!res.ok) {
        setActionError(
          data.error === "forbidden_not_super_admin"
            ? "Só o admin geral pode mudar isso."
            : data.error === "invalid_email"
              ? "E-mail inválido."
              : "Não foi possível salvar. Tente de novo."
        );
        return;
      }
      setState({ enrollmentOpen: data.enrollmentOpen, bypass: data.bypass });
      setIsConfirmingClose(false);
    } catch {
      setActionError("Falha de conexão. Tente de novo.");
    } finally {
      setIsBusy(false);
    }
  };

  if (authError) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Sistema</h1>
        <AuthNotice message="Você precisa estar logado como admin." />
      </div>
    );
  }

  if (loading || !state) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Sistema</h1>
        <p>Carregando…</p>
      </div>
    );
  }

  const isOpen = state.enrollmentOpen;

  return (
    <div style={s.page}>
      <h1 style={s.title}>Sistema</h1>
      <p style={s.subtitle}>
        A chave das inscrições e quem consegue entrar mesmo com elas encerradas.
      </p>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Inscrições</h2>
        <p style={s.cardHelp}>
          Quando estão <strong>encerradas</strong>, o botão "Fazer inscrição" da home abre
          um aviso em vez de levar ao login, e ninguém cria conta nem entra no site — só
          os e-mails da lista de exceção aqui embaixo.
        </p>

        <div style={s.stateRow}>
          <span style={{ ...s.badge, ...(isOpen ? s.open : s.closed) }}>
            {isOpen ? "Inscrições abertas" : "Inscrições encerradas"}
          </span>

          {isOpen ? (
            <button
              type="button"
              style={{ ...s.dangerBtn, ...(isBusy ? s.btnOff : {}) }}
              onClick={() => setIsConfirmingClose(true)}
              disabled={isBusy}
            >
              Encerrar as inscrições
            </button>
          ) : (
            <button
              type="button"
              style={{ ...s.primaryBtn, ...(isBusy ? s.btnOff : {}) }}
              onClick={() => send({ action: "setFlag", open: true })}
              disabled={isBusy}
            >
              {isBusy ? "Salvando…" : "Reabrir as inscrições"}
            </button>
          )}
        </div>

        {isConfirmingClose && (
          <div style={s.warnBox}>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Encerrar tranca gente de dentro.</strong> Quem já se inscreveu perde
              o acesso à própria inscrição enquanto durar o fechamento — não é só o botão
              da home que muda. Quem precisar entrar tem que estar na lista de exceção.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                style={{ ...s.dangerBtn, ...(isBusy ? s.btnOff : {}) }}
                onClick={() => send({ action: "setFlag", open: false })}
                disabled={isBusy}
              >
                {isBusy ? "Encerrando…" : "Sim, encerrar as inscrições"}
              </button>
              <button
                type="button"
                style={s.ghostBtn}
                onClick={() => setIsConfirmingClose(false)}
                disabled={isBusy}
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </section>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Lista de exceção</h2>
        <p style={s.cardHelp}>
          Estes e-mails entram mesmo com as inscrições encerradas. O e-mail tem que ser o
          mesmo da conta da pessoa. Escreva o motivo — daqui a três meses ninguém lembra
          por que aquele endereço está liberado, e aí ninguém ousa tirar.
        </p>

        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label} htmlFor="sis-email">
              E-mail
            </label>
            <input
              id="sis-email"
              style={s.input}
              type="email"
              value={newEmail}
              onChange={event => setNewEmail(event.target.value)}
              placeholder="pessoa@exemplo.com"
              disabled={isBusy}
            />
          </div>
          <div style={s.field}>
            <label style={s.label} htmlFor="sis-note">
              Motivo
            </label>
            <input
              id="sis-note"
              style={s.input}
              value={newNote}
              onChange={event => setNewNote(event.target.value)}
              placeholder="Ex.: testes da organização"
              disabled={isBusy}
            />
          </div>
          <button
            type="button"
            style={{ ...s.primaryBtn, ...(isBusy || !newEmail.trim() ? s.btnOff : {}) }}
            onClick={async () => {
              await send({ action: "addBypass", email: newEmail, note: newNote });
              setNewEmail("");
              setNewNote("");
            }}
            disabled={isBusy || !newEmail.trim()}
          >
            Liberar este e-mail
          </button>
        </div>

        {state.bypass.length === 0 ? (
          <p style={s.empty}>Ninguém liberado. Com as inscrições encerradas, ninguém entra.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>E-mail</th>
                <th style={s.th}>Motivo</th>
                <th style={s.th}>Liberado por</th>
                <th style={s.th}>Quando</th>
                <th style={s.th} />
              </tr>
            </thead>
            <tbody>
              {state.bypass.map(entry => (
                <tr key={entry.email}>
                  <td style={s.td}>{entry.email}</td>
                  <td style={s.td}>{entry.note || "—"}</td>
                  <td style={s.td}>{entry.created_by || "—"}</td>
                  <td style={s.td}>{formatDate(entry.created_at)}</td>
                  <td style={s.td}>
                    <button
                      type="button"
                      style={{ ...s.ghostBtn, ...(isBusy ? s.btnOff : {}) }}
                      onClick={() => send({ action: "removeBypass", email: entry.email })}
                      disabled={isBusy}
                    >
                      Tirar da lista
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {actionError && <p style={s.error}>{actionError}</p>}
    </div>
  );
};

export default AdminSistema;
