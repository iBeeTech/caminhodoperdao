import React from "react";
import { Link } from "react-router-dom";
import { getAdminToken } from "../../../utils/auth/adminSession";

interface ResetRequest {
  id: number;
  email: string;
  requestedAt: number;
  isAdmin: boolean;
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: "24px 20px 60px", maxWidth: 860, margin: "0 auto" },
  title: { fontSize: 24, margin: "0 0 6px", color: "#1d1d1f" },
  subtitle: { margin: "0 0 24px", color: "#4b5563", fontSize: 14, lineHeight: 1.5 },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  email: { fontWeight: 700, color: "#1d1d1f", fontSize: 15 },
  meta: { color: "#6b7280", fontSize: 13, margin: "2px 0 0" },
  spacer: { flex: 1 },
  button: {
    padding: "0.55rem 1rem",
    borderRadius: 8,
    border: "1px solid #1f7a3d",
    background: "#1f7a3d",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  warnTag: {
    fontSize: 12,
    fontWeight: 700,
    color: "#92400e",
    background: "#fef3c7",
    border: "1px solid #fde68a",
    borderRadius: 999,
    padding: "2px 8px",
  },
  secret: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    color: "#7c2d12",
    lineHeight: 1.5,
  },
  code: {
    display: "inline-block",
    marginTop: 6,
    padding: "6px 10px",
    background: "#fff",
    border: "1px solid #fed7aa",
    borderRadius: 6,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 17,
    letterSpacing: "0.06em",
    color: "#1d1d1f",
    userSelect: "all",
  },
  empty: { color: "#6b7280", fontSize: 14 },
};

/**
 * Fila de "Esqueci minha senha". O pedido em si não redefine nada — aqui o
 * super admin gera uma senha temporária aleatória e a repassa por fora
 * (WhatsApp). Quem entrar com ela é obrigado a trocá-la antes de acessar.
 */
const PedidosSenhaPage: React.FC = () => {
  const [requests, setRequests] = React.useState<ResetRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [issued, setIssued] = React.useState<{ email: string; tempPassword: string } | null>(null);
  const [busyEmail, setBusyEmail] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/admin/reset-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setAuthError(true);
        return;
      }
      if (!response.ok) throw new Error("load_failed");
      const data = (await response.json()) as { requests?: ResetRequest[] };
      setRequests(data.requests ?? []);
    } catch {
      setFeedback("Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleReset = async (email: string) => {
    const token = getAdminToken();
    if (!token) {
      setAuthError(true);
      return;
    }
    setBusyEmail(email);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/reset-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        setFeedback(
          response.status === 404
            ? "Esse e-mail não é de um admin cadastrado."
            : "Não foi possível redefinir a senha."
        );
        return;
      }
      const data = (await response.json()) as { email: string; tempPassword: string };
      setIssued(data);
      await load();
    } catch {
      setFeedback("Não foi possível redefinir a senha.");
    } finally {
      setBusyEmail(null);
    }
  };

  if (authError) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Pedidos de senha</h1>
        <p style={s.subtitle}>
          Você precisa estar logado como administrador geral.{" "}
          <Link to="/admin">Ir para o login</Link>.
        </p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Pedidos de senha</h1>
      <p style={s.subtitle}>
        Quem clicou em "Esqueci minha senha" aparece aqui. Redefinir gera uma senha temporária
        aleatória — passe para a pessoa por WhatsApp. Ela é obrigada a trocar no primeiro acesso, e a
        senha temporária deixa de valer.
      </p>

      {issued && (
        <div style={s.secret} role="status">
          <strong>Senha temporária de {issued.email}</strong>
          <p style={{ margin: "6px 0 0" }}>
            Aparece só agora. Copie e repasse — ela não fica salva em lugar nenhum.
          </p>
          <code style={s.code}>{issued.tempPassword}</code>
          <p style={{ margin: "10px 0 0" }}>
            <button type="button" style={s.button} onClick={() => setIssued(null)}>
              Já anotei
            </button>
          </p>
        </div>
      )}

      {feedback && <p style={{ color: "#c62828" }}>{feedback}</p>}

      {loading ? (
        <p style={s.empty}>Carregando...</p>
      ) : requests.length === 0 ? (
        <p style={s.empty}>Nenhum pedido em aberto.</p>
      ) : (
        requests.map(request => (
          <div key={request.id} style={s.card}>
            <div>
              <div style={s.email}>{request.email}</div>
              <p style={s.meta}>Pedido em {new Date(request.requestedAt).toLocaleString("pt-BR")}</p>
            </div>
            {/* Pedido de e-mail que não é admin: digitação errada ou sondagem.
                Não há o que redefinir. */}
            {!request.isAdmin && <span style={s.warnTag}>não é admin</span>}
            <div style={s.spacer} />
            {request.isAdmin && (
              <button
                type="button"
                style={s.button}
                disabled={busyEmail === request.email}
                onClick={() => handleReset(request.email)}
              >
                {busyEmail === request.email ? "Redefinindo..." : "Redefinir senha"}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default PedidosSenhaPage;
