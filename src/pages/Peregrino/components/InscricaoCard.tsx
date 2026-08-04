import React from "react";
import { theme } from "../../../styles/theme";
import ProfileForm from "./ProfileForm";
import {
  Me,
  MyRegistration,
  PilgrimProfile,
  SessionExpiredError,
  createRegistration,
  fetchMyRegistration,
  messageForError,
  saveProfile,
} from "../api";

/**
 * "Inscrição — {ano}", dentro do Meu Caminho.
 *
 * A inscrição saiu do site público e passou a acontecer aqui (Planning.md,
 * bloco 1): o e-mail do login É o e-mail da inscrição, por construção.
 *
 * O caminho da pessoa:
 *
 * 1. **Antes de abrir** — contagem regressiva até a data, botão desligado.
 * 2. **Aberta** — botão "Quero me inscrever" abre "Confira seus dados".
 * 3. **Dados incompletos** — a mesma janela abre o FORMULÁRIO em vez da
 *    conferência. Mandar a pessoa para outra tela e depois trazer de volta é o
 *    jeito mais rápido de perdê-la no meio do caminho.
 * 4. **Inscrita** — some o botão e aparece o status.
 *
 * ⚠️ **Ainda não dá para pagar.** A adquirente será trocada e não foi
 * escolhida; a inscrição nasce pendente e a tela diz isso. Cancelar e transferir
 * dependem dessa mesma decisão e ainda não existem.
 */

const c = theme.colors;

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: theme.radius.lg,
    padding: "20px 18px",
    marginTop: 22,
    boxShadow: theme.shadows.sm,
  },
  head: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    flexWrap: "wrap",
  },
  title: { color: c.primary, fontSize: 17, fontWeight: 800, margin: 0 },
  help: { color: c.muted, fontSize: 13, lineHeight: 1.6, margin: "6px 0 0" },
  countdown: {
    display: "flex",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
  },
  unit: {
    background: c.background,
    border: `1px solid ${c.border}`,
    borderRadius: theme.radius.md,
    padding: "10px 14px",
    textAlign: "center",
    minWidth: 68,
  },
  unitValue: { color: c.primary, fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.1 },
  unitLabel: { color: c.muted, fontSize: 11, margin: "2px 0 0" },
  status: {
    display: "inline-block",
    padding: "0.2rem 0.7rem",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 12,
  },
  statusPending: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" },
  statusPaid: { background: "#f0fdf4", color: "#14532d", border: "1px solid #bbf7d0" },
  statusCanceled: { background: "#fef2f2", color: "#7f1d1d", border: "1px solid #fecaca" },
  primaryButton: {
    marginTop: 18,
    padding: "0.8rem 1.2rem",
    borderRadius: theme.radius.sm,
    border: "none",
    background: `linear-gradient(150deg, ${c.gold} 0%, ${c.goldDark} 100%)`,
    color: "#4a3105",
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
  },
  buttonOff: { opacity: 0.55, cursor: "not-allowed" },
  soon: {
    marginTop: 16,
    padding: "12px 14px",
    borderRadius: theme.radius.md,
    background: c.background,
    border: `1px dashed ${c.border}`,
    color: c.muted,
    fontSize: 13,
    lineHeight: 1.6,
  },
  warn: {
    marginTop: 14,
    padding: "12px 14px",
    borderRadius: theme.radius.md,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    fontSize: 13,
    lineHeight: 1.6,
  },
  error: {
    marginTop: 14,
    padding: 12,
    borderRadius: theme.radius.sm,
    background: "#fef2f2",
    border: `1px solid ${c.warning}`,
    color: c.warningText,
    fontSize: 14,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,16,38,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 2000,
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    background: "none",
    border: "none",
    padding: 0,
    cursor: "default",
  },
  modal: {
    position: "relative",
    background: c.surface,
    borderRadius: theme.radius.lg,
    padding: "22px 20px",
    width: "100%",
    maxWidth: 660,
    maxHeight: "88vh",
    overflowY: "auto",
    boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
    boxSizing: "border-box",
  },
  modalHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  modalTitle: { color: c.primary, fontSize: 19, fontWeight: 800, margin: 0 },
  close: {
    background: c.background,
    border: `1px solid ${c.border}`,
    borderRadius: 999,
    width: 32,
    height: 32,
    fontSize: 16,
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
  },
  readRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "10px 0",
    borderBottom: `1px solid ${c.border}`,
  },
  readLabel: { color: c.muted, fontSize: 13, margin: 0 },
  readValue: { color: c.text, fontSize: 14, fontWeight: 700, margin: 0, textAlign: "right" },
  choiceRow: { display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14 },
  choiceLabel: { fontSize: 14, color: c.text, lineHeight: 1.5 },
  field: { display: "flex", flexDirection: "column", gap: 6, marginTop: 14 },
  label: { fontWeight: 700, fontSize: 13, color: c.text },
  input: {
    width: "100%",
    padding: "0.65rem 0.75rem",
    borderRadius: theme.radius.sm,
    border: `1px solid ${c.border}`,
    fontSize: 15,
    color: c.text,
    boxSizing: "border-box",
  },
  editLink: {
    background: "none",
    border: "none",
    color: c.secondary,
    textDecoration: "underline",
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
    marginTop: 12,
  },
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Inscrição confirmada",
  CANCELED: "Inscrição cancelada",
};

function statusStyle(status: string): React.CSSProperties {
  if (status === "PAID") return { ...styles.status, ...styles.statusPaid };
  if (status === "CANCELED") return { ...styles.status, ...styles.statusCanceled };
  return { ...styles.status, ...styles.statusPending };
}

/** Quanto falta para a abertura, em dias/horas/minutos/segundos. */
function useCountdown(target: number): { d: number; h: number; m: number; s: number } {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, target - now);
  return {
    d: Math.floor(left / 86400000),
    h: Math.floor((left % 86400000) / 3600000),
    m: Math.floor((left % 3600000) / 60000),
    s: Math.floor((left % 60000) / 1000),
  };
}

interface InscricaoCardProps {
  me: Me;
  onProfileSaved: (profile: PilgrimProfile, hasCpf: boolean, cpfMasked: string | null) => void;
  onSessionExpired: () => void;
  whatsappUrl: string | null;
}

const InscricaoCard: React.FC<InscricaoCardProps> = ({
  me,
  onProfileSaved,
  onSessionExpired,
  whatsappUrl,
}) => {
  const [data, setData] = React.useState<MyRegistration | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [form, setForm] = React.useState<PilgrimProfile>(me.profile);
  const [cpfInput, setCpfInput] = React.useState("");
  const [sleepAtMonastery, setSleepAtMonastery] = React.useState(false);
  const [companionName, setCompanionName] = React.useState("");
  const [acceptsTerms, setAcceptsTerms] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState("");
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isActive = true;
    fetchMyRegistration()
      .then(result => {
        if (isActive) setData(result);
      })
      .catch(loadError => {
        if (loadError instanceof SessionExpiredError) onSessionExpired();
      });
    return () => {
      isActive = false;
    };
  }, [onSessionExpired]);

  const countdown = useCountdown(data?.opensAt ?? Date.now());

  if (!data) return null;

  const openModal = () => {
    setForm(me.profile);
    setError(null);
    // Perfil incompleto abre direto no formulário: não há o que "conferir".
    setIsEditing(data.missingProfileFields.length > 0);
    setIsModalOpen(true);
  };

  const handleSaveProfile = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const saved = await saveProfile(form, me.hasCpf ? undefined : cpfInput);
      onProfileSaved(saved.profile, saved.hasCpf, saved.cpfMasked);
      setForm(saved.profile);
      setCpfInput("");
      setIsEditing(false);
      // Recarrega o que falta: o servidor é quem sabe se o cadastro ficou
      // completo, e repetir essa regra na tela faria as duas divergirem.
      setData(await fetchMyRegistration());
    } catch (saveError) {
      if (saveError instanceof SessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError(messageForError(saveError));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmit = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await createRegistration({
        sleepAtMonastery,
        companionName,
        acceptsTerms,
        inviteCode: inviteCode.trim() || undefined,
      });
      setData(await fetchMyRegistration());
      setIsModalOpen(false);
    } catch (submitError) {
      if (submitError instanceof SessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError(messageForError(submitError));
    } finally {
      setIsBusy(false);
    }
  };

  const registration = data.registration;
  const isActiveRegistration = registration && registration.status !== "CANCELED";

  return (
    <div style={styles.card}>
      <div style={styles.head}>
        <h2 style={styles.title}>Inscrição — {data.eventYear}</h2>
        {registration && <span style={statusStyle(registration.status)}>{STATUS_LABEL[registration.status]}</span>}
      </div>

      {isActiveRegistration ? (
        <>
          <p style={styles.help}>
            {registration.sleepAtMonastery
              ? "Você se inscreveu com pernoite no mosteiro."
              : "Você se inscreveu na modalidade geral, sem pernoite."}
            {registration.usedInviteCode && " Sua vaga entrou por código de convite."}
          </p>
          {registration.status === "PENDING" && (
            <div style={styles.warn}>
              <strong>Sua vaga está reservada, mas ainda não há como pagar.</strong> A
              organização está trocando a forma de pagamento e vai avisar por e-mail
              assim que o pagamento abrir.
            </div>
          )}
          <div style={styles.soon}>
            <strong>Em breve neste espaço:</strong> cancelar a inscrição e passar a vaga
            para outra pessoa. As duas coisas mexem em dinheiro e dependem da adquirente
            nova, que ainda não foi escolhida.
          </div>
        </>
      ) : (
        <>
          <p style={styles.help}>
            {data.isOpen
              ? "As inscrições estão abertas. Confira seus dados e garanta sua vaga."
              : `As inscrições abrem em ${new Date(data.opensAt).toLocaleDateString("pt-BR")}.`}
          </p>

          {!data.isOpen && (
            <div style={styles.countdown}>
              {[
                { value: countdown.d, label: "dias" },
                { value: countdown.h, label: "horas" },
                { value: countdown.m, label: "minutos" },
                { value: countdown.s, label: "segundos" },
              ].map(unit => (
                <div key={unit.label} style={styles.unit}>
                  <p style={styles.unitValue}>{unit.value}</p>
                  <p style={styles.unitLabel}>{unit.label}</p>
                </div>
              ))}
            </div>
          )}

          {data.isForced && (
            <div style={styles.warn}>
              <strong>Modo de teste.</strong> A inscrição está aberta antes da data por uma
              chave de configuração, para a organização testar o fluxo.
            </div>
          )}

          {data.needsInviteCode && (
            <div style={styles.warn}>
              As {data.capacity.limit} vagas acabaram. Ainda dá para entrar com um{" "}
              <strong>código de convite</strong> fornecido pela organização.
            </div>
          )}

          <button
            type="button"
            style={{ ...styles.primaryButton, ...(data.isOpen ? {} : styles.buttonOff) }}
            onClick={openModal}
            disabled={!data.isOpen}
          >
            {data.isOpen ? "Quero me inscrever" : "Inscrições ainda fechadas"}
          </button>
        </>
      )}

      {isModalOpen && (
        <div style={styles.overlay}>
          <button
            type="button"
            style={styles.backdrop}
            aria-label="Fechar"
            onClick={() => setIsModalOpen(false)}
          />
          <div style={styles.modal} role="dialog" aria-modal="true" aria-label="Confira seus dados">
            <div style={styles.modalHead}>
              <h3 style={styles.modalTitle}>
                {isEditing ? "Complete seus dados" : "Confira seus dados"}
              </h3>
              <button
                type="button"
                style={styles.close}
                onClick={() => setIsModalOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {isEditing ? (
              <>
                <p style={styles.help}>
                  Falta preencher: {data.missingProfileFields.join(", ")}. É o mesmo
                  cadastro do seu perfil — preenchendo aqui, fica salvo para sempre.
                </p>
                <div style={{ marginTop: 14 }}>
                  <ProfileForm
                    value={form}
                    onChange={setForm}
                    cpfMasked={me.cpfMasked}
                    hasCpf={me.hasCpf}
                    cpfInput={cpfInput}
                    onCpfInputChange={setCpfInput}
                    whatsappUrl={whatsappUrl}
                  />
                </div>
                <button
                  type="button"
                  style={{ ...styles.primaryButton, ...(isBusy ? styles.buttonOff : {}) }}
                  onClick={handleSaveProfile}
                  disabled={isBusy}
                >
                  {isBusy ? "Salvando..." : "Salvar e continuar"}
                </button>
              </>
            ) : (
              <>
                <ReadRow label="Nome" value={me.profile.name} />
                <ReadRow label="CPF" value={me.cpfMasked ?? "cadastrado"} />
                <ReadRow label="E-mail" value={me.email} />
                <ReadRow label="Telefone" value={me.profile.phone} />
                <ReadRow label="Nascimento" value={me.profile.dateOfBirth} />
                <ReadRow
                  label="Cidade"
                  value={[me.profile.city, me.profile.state].filter(Boolean).join(" / ")}
                />

                <button type="button" style={styles.editLink} onClick={() => setIsEditing(true)}>
                  Algum dado está errado? Editar
                </button>

                <div style={styles.choiceRow}>
                  <input
                    id="ins-sleep"
                    type="checkbox"
                    checked={sleepAtMonastery}
                    onChange={event => setSleepAtMonastery(event.target.checked)}
                  />
                  <label style={styles.choiceLabel} htmlFor="ins-sleep">
                    Quero dormir no mosteiro (vagas limitadas)
                  </label>
                </div>

                <div style={styles.field}>
                  <label style={styles.label} htmlFor="ins-companion">
                    Acompanhante (opcional)
                  </label>
                  <input
                    id="ins-companion"
                    style={styles.input}
                    value={companionName}
                    onChange={event => setCompanionName(event.target.value)}
                    placeholder="Nome de quem vai com você"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label} htmlFor="ins-invite">
                    Código de convite {data.needsInviteCode ? "(obrigatório)" : "(se você tiver)"}
                  </label>
                  <input
                    id="ins-invite"
                    style={styles.input}
                    value={inviteCode}
                    onChange={event => setInviteCode(event.target.value.toUpperCase())}
                    placeholder="O código que a organização enviou"
                  />
                </div>

                <div style={styles.choiceRow}>
                  <input
                    id="ins-terms"
                    type="checkbox"
                    checked={acceptsTerms}
                    onChange={event => setAcceptsTerms(event.target.checked)}
                  />
                  <label style={styles.choiceLabel} htmlFor="ins-terms">
                    Li e aceito o{" "}
                    <a href="/responsabilityTerms" target="_blank" rel="noopener noreferrer">
                      termo de responsabilidade
                    </a>
                    .
                  </label>
                </div>

                <button
                  type="button"
                  style={{
                    ...styles.primaryButton,
                    ...(acceptsTerms && !isBusy ? {} : styles.buttonOff),
                  }}
                  onClick={handleSubmit}
                  disabled={!acceptsTerms || isBusy}
                >
                  {isBusy ? "Inscrevendo..." : "Confirmar inscrição"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ReadRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={styles.readRow}>
    <p style={styles.readLabel}>{label}</p>
    <p style={styles.readValue}>{value || "—"}</p>
  </div>
);

export default InscricaoCard;
