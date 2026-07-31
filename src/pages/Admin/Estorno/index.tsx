import React from "react";
import AuthNotice from "../AuthNotice";

const STORAGE_KEY = "admin_jwt";

type RefundStatus = "PENDENTE" | "FEITO" | "CANCELADO";

interface RefundRequest {
  id: string;
  type: "inscricao" | "camiseta" | "downgrade";
  source_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  amount_cents: number;
  refund_status: RefundStatus;
  /** Informada por quem cancelou. Nula nos estornos anteriores ao campo e
      quando a pessoa preferiu combinar por fora. */
  pix_key: string | null;
  created_at: string;
  updated_at: string;
}

const TYPE_LABEL: Record<RefundRequest["type"], string> = {
  inscricao: "Inscrição",
  camiseta: "Camiseta",
  downgrade: "Pernoite → Geral",
};

// O que a pessoa cancelou, na frase da cobrança do estorno. Sem isso a mensagem
// diria "cancelou sua inscrição" para quem só cancelou a camiseta ou trocou o pernoite.
const TYPE_PHRASE: Record<RefundRequest["type"], string> = {
  inscricao: "Você cancelou sua inscrição.",
  camiseta: "Você cancelou seu pedido de camiseta.",
  downgrade: "Você trocou a inscrição com pernoite no mosteiro pela geral.",
};

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// wa.me exige o número com código do país. Alguns telefones já vieram gravados
// com o 55 na frente (13 dígitos), então só prefixamos quando falta.
const buildWhatsappUrl = (r: RefundRequest): string | null => {
  const digits = (r.phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const firstName = r.name.trim().split(/\s+/)[0] || r.name;
  const message =
    `Olá ${firstName}, sou o Cássio do Caminho do Perdão! ` +
    `${TYPE_PHRASE[r.type]} Já recebeu o estorno?`;
  return `https://wa.me/55${national}?text=${encodeURIComponent(message)}`;
};

// Cores por status do estorno: Pendente (amarelo), Feito (verde), Cancelado (vermelho).
const STATUS_STYLE: Record<RefundStatus, React.CSSProperties> = {
  PENDENTE: { color: "#a16207", borderColor: "#fde68a", background: "#fefce8" },
  FEITO: { color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" },
  CANCELADO: { color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" },
};

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.5rem", marginBottom: "0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.5rem", fontSize: "0.95rem" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: { textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem", whiteSpace: "nowrap" },
  td: { borderBottom: "1px solid #eee", padding: "0.5rem", verticalAlign: "middle" },
  select: { padding: "0.35rem 0.5rem", borderRadius: 6, border: "1px solid #bbb" },
  waBtn: {
    display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem",
    borderRadius: 8, border: "none", background: "#25d366", color: "#fff", fontWeight: 600,
    fontSize: "0.85rem", cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
  },
  saveBtn: {
    marginTop: "1.25rem", padding: "0.6rem 1.4rem", borderRadius: 8, border: "none",
    background: "#1f7a3d", color: "#fff", fontWeight: 600, cursor: "pointer",
  },
  feedback: { marginLeft: "1rem", fontWeight: 600 },
  empty: { color: "#777", padding: "2rem 0" },
};

const EstornoPage: React.FC = () => {
  const [token] = React.useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [refunds, setRefunds] = React.useState<RefundRequest[]>([]);
  const [edits, setEdits] = React.useState<Record<string, RefundStatus>>({});
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/refunds", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      const data = (await res.json()) as { refunds?: RefundRequest[] };
      setRefunds(data.refunds ?? []);
    } catch {
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const statusFor = (r: RefundRequest): RefundStatus => edits[r.id] ?? r.refund_status;

  const handleChange = (id: string, value: RefundStatus) => {
    setEdits((prev) => ({ ...prev, [id]: value }));
    setFeedback(null);
  };

  const handleSave = async () => {
    if (!token) return;
    const updates = Object.entries(edits).map(([id, refund_status]) => ({ id, refund_status }));
    if (updates.length === 0) {
      setFeedback("Nada para salvar.");
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error("save_failed");
      setRefunds((prev) => prev.map((r) => (edits[r.id] ? { ...r, refund_status: edits[r.id] } : r)));
      setEdits({});
      setFeedback("Salvo!");
    } catch {
      setFeedback("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (authError) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Estornos</h1>
        <AuthNotice />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Estornos — cancelamentos pelo site</h1>
      <p style={styles.subtitle}>
        Pessoas que cancelaram inscrição/camiseta paga ou trocaram pernoite→geral. Defina o status do
        estorno e clique em Salvar. Em "Cobrar no WhatsApp" a mensagem perguntando se o estorno já
        chegou abre pronta. (Quem deixou o PIX expirar não aparece aqui.)
      </p>

      {loading ? (
        <p>Carregando…</p>
      ) : refunds.length === 0 ? (
        <p style={styles.empty}>Nenhum estorno pendente.</p>
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Telefone</th>
                <th style={styles.th}>E-mail</th>
                <th style={styles.th}>Pix</th>
                <th style={styles.th}>Valor</th>
                <th style={styles.th}>Estorno</th>
                <th style={styles.th}>WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => {
                const whatsappUrl = buildWhatsappUrl(r);
                return (
                <tr key={r.id}>
                  <td style={styles.td}>{TYPE_LABEL[r.type]}</td>
                  <td style={styles.td}>{r.name || "—"}</td>
                  <td style={styles.td}>{r.phone || "—"}</td>
                  {/* user-select: all — a chave é copiada para fazer o PIX. */}
                  <td style={styles.td}>{r.email || "—"}</td>
                  <td style={{ ...styles.td, userSelect: "all", fontFamily: "monospace" }}>
                    {r.pix_key || "—"}
                  </td>
                  <td style={styles.td}>{formatBRL(r.amount_cents)}</td>
                  <td style={styles.td}>
                    <select
                      style={{ ...styles.select, ...STATUS_STYLE[statusFor(r)], fontWeight: 600 }}
                      value={statusFor(r)}
                      onChange={(e) => handleChange(r.id, e.target.value as RefundStatus)}
                    >
                      <option value="PENDENTE">Pendente</option>
                      <option value="FEITO">Feito</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  </td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                    {whatsappUrl ? (
                      <a
                        style={styles.waBtn}
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Cobrar no WhatsApp
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>

          <div>
            <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
            {feedback && <span style={styles.feedback}>{feedback}</span>}
          </div>
        </>
      )}
    </div>
  );
};

export default EstornoPage;
