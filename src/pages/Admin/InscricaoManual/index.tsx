import React from "react";
import AuthNotice from "../AuthNotice";
import { getAdminToken } from "../../../utils/auth/adminSession";

interface Capacity {
  total: number;
  sleepers: number;
  nonStaff: number;
  totalLimit: number;
  monasteryLimit: number;
}

interface CreatedRegistration {
  registrationNumber: string;
  name: string;
  status: "PAID" | "PENDING";
  capacity: Capacity;
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: "24px 20px 60px", maxWidth: 640, margin: "0 auto" },
  title: { fontSize: 24, margin: "0 0 6px", color: "#1d1d1f" },
  subtitle: { margin: "0 0 24px", color: "#4b5563", fontSize: 14, lineHeight: 1.5 },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
  },
  field: { marginBottom: 16 },
  label: {
    display: "block",
    fontWeight: 700,
    fontSize: 14,
    color: "#1d1d1f",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "0.6rem 0.75rem",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 15,
    boxSizing: "border-box",
  },
  checkRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  checkLabel: { fontSize: 15, color: "#1d1d1f" },
  hint: { color: "#6b7280", fontSize: 13, margin: "4px 0 0", lineHeight: 1.5 },
  button: {
    width: "100%",
    padding: "0.7rem 1rem",
    borderRadius: 8,
    border: "1px solid #1f7a3d",
    background: "#1f7a3d",
    color: "#fff",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
  },
  buttonOff: { opacity: 0.6, cursor: "not-allowed" },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: 12,
    color: "#991b1b",
    fontSize: 14,
    marginBottom: 16,
  },
  success: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    padding: 16,
    color: "#14532d",
    lineHeight: 1.6,
    marginBottom: 20,
  },
  code: {
    display: "inline-block",
    marginTop: 4,
    fontFamily: "monospace",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 1,
  },
  overCap: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 8,
    padding: 12,
    color: "#92400e",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 12,
  },
};

const MIN_NAME_LENGTH = 3;
const MIN_PHONE_DIGITS = 10;

/** Só dígitos, no formato (16) 99999-9999 enquanto digita. */
function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Inscrição manual pelo admin. Existe porque a inscrição saiu do site público e
 * passou a exigir conta: quem não tem e-mail cria um, mas sobra um punhado de
 * casos que o admin resolve pessoalmente, sabendo só nome, telefone e pagamento.
 */
const AdminInscricaoManual: React.FC = () => {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [paid, setPaid] = React.useState(false);
  const [sleepAtMonastery, setSleepAtMonastery] = React.useState(false);
  const [created, setCreated] = React.useState<CreatedRegistration | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const token = getAdminToken();
  const phoneDigits = phone.replace(/\D/g, "");
  const canSubmit =
    name.trim().length >= MIN_NAME_LENGTH && phoneDigits.length >= MIN_PHONE_DIGITS;

  if (!token) {
    return <AuthNotice />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isSaving) return;

    setIsSaving(true);
    setError(null);
    setCreated(null);
    try {
      const response = await fetch("/api/admin/manual-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phoneDigits,
          paid,
          sleepAtMonastery,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (data.error === "invalid_name") setError("Nome muito curto.");
        else if (data.error === "invalid_phone") setError("Telefone inválido. Use DDD + número.");
        else setError("Não foi possível inscrever. Tente de novo.");
        return;
      }

      const data = (await response.json()) as CreatedRegistration;
      setCreated(data);
      // Limpa para a próxima pessoa: a tela é feita para cadastrar em sequência.
      setName("");
      setPhone("");
      setPaid(false);
      setSleepAtMonastery(false);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setIsSaving(false);
    }
  };

  const cap = created?.capacity;
  const overTotal = cap ? cap.nonStaff > cap.totalLimit : false;
  const overMonastery = cap ? cap.sleepers > cap.monasteryLimit : false;

  return (
    <div style={s.page}>
      <h1 style={s.title}>Inscrição manual</h1>
      <p style={s.subtitle}>
        Para quem não tem e-mail e não consegue se inscrever sozinho. A pessoa{" "}
        <strong>ocupa uma vaga</strong> normalmente, aparece na lista de credenciamento
        e conta na lotação.
      </p>

      {created && (
        <div style={s.success} role="status">
          <strong>{created.name} foi inscrito.</strong>
          <br />
          Número da inscrição:
          <br />
          <span style={s.code}>{created.registrationNumber}</span>
          <br />
          {created.status === "PAID" ? "Marcado como pago." : "Marcado como NÃO pago."}
          {cap && (
            <div style={{ fontSize: 13, marginTop: 10 }}>
              Peregrinos agora: {cap.nonStaff} de {cap.totalLimit} · Mosteiro:{" "}
              {cap.sleepers} de {cap.monasteryLimit}
            </div>
          )}
          {(overTotal || overMonastery) && (
            <div style={s.overCap}>
              ⚠️ {overTotal && `A lotação de peregrinos passou do limite. `}
              {overMonastery && `As camas do mosteiro passaram do limite. `}
              A inscrição foi feita mesmo assim — quem cadastra à mão decide. Só não
              deixe para descobrir isso no dia do evento.
            </div>
          )}
        </div>
      )}

      <form style={s.card} onSubmit={handleSubmit}>
        {error && <div style={s.error}>{error}</div>}

        <div style={s.field}>
          <label style={s.label} htmlFor="manual-name">
            Nome completo
          </label>
          <input
            id="manual-name"
            style={s.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome e sobrenome"
            autoComplete="off"
          />
        </div>

        <div style={s.field}>
          <label style={s.label} htmlFor="manual-phone">
            Telefone
          </label>
          <input
            id="manual-phone"
            style={s.input}
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
            placeholder="(16) 99999-9999"
            inputMode="tel"
            autoComplete="off"
          />
          <p style={s.hint}>Com DDD. É o único jeito de falar com a pessoa depois.</p>
        </div>

        <div style={s.checkRow}>
          <input
            id="manual-paid"
            type="checkbox"
            checked={paid}
            onChange={e => setPaid(e.target.checked)}
          />
          <label style={s.checkLabel} htmlFor="manual-paid">
            Já pagou
          </label>
        </div>

        <div style={s.checkRow}>
          <input
            id="manual-sleep"
            type="checkbox"
            checked={sleepAtMonastery}
            onChange={e => setSleepAtMonastery(e.target.checked)}
          />
          <label style={s.checkLabel} htmlFor="manual-sleep">
            Vai dormir no mosteiro
          </label>
        </div>
        <p style={s.hint}>
          Deixe desmarcado se for peregrino geral. O mosteiro tem número limitado de
          camas, então isso conta separado.
        </p>

        <div style={{ marginTop: 20 }}>
          <button
            type="submit"
            style={{ ...s.button, ...(canSubmit && !isSaving ? {} : s.buttonOff) }}
            disabled={!canSubmit || isSaving}
          >
            {isSaving ? "Inscrevendo..." : "Inscrever"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminInscricaoManual;
