import React from "react";
import { theme } from "../../../styles/theme";
import { applyPhoneInput, formatPhoneBR } from "../../../utils/formatters/phone";
import {
  HostingEligibility,
  HostingInput,
  HostingOffer,
  SessionExpiredError,
  cancelHosting,
  messageForError,
  saveHosting,
} from "../api";

/**
 * Acolhimento — quem mora em Franca ou Claraval recebe peregrinos de fora
 * (migration 038).
 *
 * A caminhada acontece em **Claraval**. Franca entra na lista porque fica a
 * uns 20 minutos de lá: quem mora nas duas cidades consegue receber alguém sem
 * que a hospedagem vire uma segunda viagem.
 *
 * A pergunta vive DENTRO do formulário de inscrição (`InscricaoCard`), e não
 * num cartão à parte. O momento em que a pessoa está decidindo se caminha é o
 * mesmo em que ela consegue decidir se recebe alguém; perguntar depois, em
 * outro lugar da tela, é perguntar para quem já foi embora.
 *
 * Este arquivo tem as duas metades disso:
 *
 * - `AcolhimentoFields` — a caixinha e os campos, dentro do formulário.
 * - `AcolhimentoResumo` — depois de inscrita, o que ela combinou, com mudar e
 *   desistir. É também a porta de quem só se lembrou depois.
 *
 * ⚠️ **Quem diz se a pessoa pode acolher é o servidor**, pela cidade do
 * cadastro. Estas telas só obedecem ao `eligible` que veio na resposta —
 * repetir a regra aqui faria as duas divergirem na primeira cidade nova.
 */

const c = theme.colors;

const styles: Record<string, React.CSSProperties> = {
  box: {
    marginTop: 18,
    padding: "14px 16px",
    borderRadius: theme.radius.md,
    background: c.background,
    border: `1px dashed ${c.goldDark}`,
  },
  boxTitle: { color: c.primary, fontSize: 15, fontWeight: 800, margin: 0 },
  help: { color: c.muted, fontSize: 13, lineHeight: 1.6, margin: "6px 0 0" },
  checkRow: { display: "flex", alignItems: "flex-start", gap: 8, marginTop: 12 },
  checkLabel: { fontSize: 14, color: c.text, lineHeight: 1.5 },
  field: { display: "flex", flexDirection: "column", gap: 6, marginTop: 14 },
  label: { fontWeight: 700, fontSize: 13, color: c.text },
  input: {
    width: "100%",
    padding: "0.65rem 0.75rem",
    borderRadius: theme.radius.sm,
    border: `1px solid ${c.border}`,
    fontSize: 15,
    color: c.text,
    background: c.surface,
    boxSizing: "border-box",
  },
  textarea: { minHeight: 80, resize: "vertical" },
  hint: { color: c.muted, fontSize: 12, lineHeight: 1.5, margin: "2px 0 0" },
  readRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "8px 0",
    borderBottom: `1px solid ${c.border}`,
  },
  readLabel: { color: c.muted, fontSize: 13, margin: 0 },
  readValue: { color: c.text, fontSize: 14, fontWeight: 700, margin: 0, textAlign: "right" },
  actionsRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 },
  ghostButton: {
    padding: "0.6rem 1rem",
    borderRadius: theme.radius.sm,
    border: `1px solid ${c.border}`,
    background: c.surface,
    color: c.text,
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  dangerButton: {
    padding: "0.6rem 1rem",
    borderRadius: theme.radius.sm,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  goldButton: {
    marginTop: 14,
    padding: "0.7rem 1.1rem",
    borderRadius: theme.radius.sm,
    border: "none",
    background: `linear-gradient(150deg, ${c.gold} 0%, ${c.goldDark} 100%)`,
    color: "#4a3105",
    fontWeight: 800,
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  buttonOff: { opacity: 0.55, cursor: "not-allowed" },
  error: {
    marginTop: 12,
    padding: 12,
    borderRadius: theme.radius.sm,
    background: "#fef2f2",
    border: `1px solid ${c.warning}`,
    color: c.warningText,
    fontSize: 14,
  },
};

const GENDER_OPTIONS: ReadonlyArray<{ value: HostingInput["genderPreference"]; label: string }> = [
  { value: "qualquer", label: "Tanto faz" },
  { value: "feminino", label: "Prefiro receber mulheres" },
  { value: "masculino", label: "Prefiro receber homens" },
];

const GENDER_LABEL: Record<HostingInput["genderPreference"], string> = {
  qualquer: "Tanto faz",
  feminino: "Mulheres",
  masculino: "Homens",
};

const EXTRAS: ReadonlyArray<{ key: keyof HostingInput & string; label: string }> = [
  { key: "offersShower", label: "Banho" },
  { key: "offersMeal", label: "Alguma refeição (café, janta)" },
  { key: "offersTransport", label: "Carona até o ponto de saída ou de chegada" },
];

/** O formulário em branco, já com o endereço e o telefone do cadastro. */
export function emptyHostingInput(hosting: HostingEligibility): HostingInput {
  return {
    spots: 1,
    genderPreference: "qualquer",
    offersMeal: false,
    offersShower: true,
    offersTransport: false,
    address: hosting.suggested.address,
    contactPhone: hosting.suggested.contactPhone,
    notes: "",
  };
}

/** O formulário preenchido com uma oferta que já existe (editar). */
export function hostingInputFrom(offer: HostingOffer): HostingInput {
  return {
    spots: offer.spots,
    genderPreference: offer.genderPreference,
    offersMeal: offer.offersMeal,
    offersShower: offer.offersShower,
    offersTransport: offer.offersTransport,
    address: offer.address,
    contactPhone: offer.contactPhone,
    notes: offer.notes,
  };
}

/**
 * Onde a pessoa está em relação à caminhada.
 *
 * A caminhada acontece em Claraval. Dizer "é daqui que a caminhada acontece"
 * para quem mora em Franca seria simplesmente falso — e a frase existe para
 * convencer alguém a abrir a casa, então ela precisa ser verdadeira.
 */
function distanceSentence(city: HostingOffer["city"] | null): string {
  return city === "franca"
    ? "que fica a apenas 20 minutos de onde a caminhada acontece"
    : "e é daqui que a caminhada acontece";
}

/** "banho, refeição" — o que a casa oferece além da cama. */
function extrasOf(offer: HostingOffer): string {
  const extras = [
    offer.offersShower && "banho",
    offer.offersMeal && "refeição",
    offer.offersTransport && "carona",
  ].filter(Boolean);
  return extras.length > 0 ? extras.join(", ") : "só o lugar para dormir";
}

interface AcolhimentoFieldsProps {
  hosting: HostingEligibility;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  value: HostingInput;
  onChange: (next: HostingInput) => void;
  disabled?: boolean;
  /** Some quando o bloco está dentro de uma janela só de acolhimento. */
  showIntro?: boolean;
}

/**
 * A caixinha "quero acolher" e o que ela abre. Uma pergunta a mais no
 * formulário para quem é das duas cidades, e nenhuma para o resto do país.
 */
export const AcolhimentoFields: React.FC<AcolhimentoFieldsProps> = ({
  hosting,
  enabled,
  onToggle,
  value,
  onChange,
  disabled = false,
  showIntro = true,
}) => {
  if (!hosting.eligible) return null;

  const set = <K extends keyof HostingInput>(key: K, fieldValue: HostingInput[K]) =>
    onChange({ ...value, [key]: fieldValue });

  return (
    <div style={styles.box}>
      {showIntro && (
        <>
          <p style={styles.boxTitle}>Acolhimento</p>
          <p style={styles.help}>
            Você mora em <strong>{hosting.cityLabel}</strong>,{" "}
            {distanceSentence(hosting.city)}. Muita gente vem de longe e não tem onde
            ficar. Se você tem um canto sobrando — um quarto, um colchão, um sofá —, dá
            para receber alguém. A organização combina tudo com você antes do dia.
          </p>
        </>
      )}

      <div style={styles.checkRow}>
        <input
          id="ac-enabled"
          type="checkbox"
          checked={enabled}
          onChange={event => onToggle(event.target.checked)}
          disabled={disabled}
        />
        <label style={styles.checkLabel} htmlFor="ac-enabled">
          Quero <strong>receber peregrinos de fora</strong> na minha casa.
        </label>
      </div>

      {enabled && (
        <>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="ac-spots">
              Quantas pessoas você consegue receber?
            </label>
            <input
              id="ac-spots"
              style={styles.input}
              type="number"
              min={1}
              max={20}
              inputMode="numeric"
              value={value.spots}
              onChange={event => set("spots", Number(event.target.value))}
              disabled={disabled}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="ac-gender">
              Prefere receber
            </label>
            <select
              id="ac-gender"
              style={styles.input}
              value={value.genderPreference}
              onChange={event =>
                set("genderPreference", event.target.value as HostingInput["genderPreference"])
              }
              disabled={disabled}
            >
              {GENDER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p style={styles.hint}>
              É o seu conforto que manda aqui. A organização respeita a preferência.
            </p>
          </div>

          <p style={{ ...styles.label, marginTop: 16 }}>
            Além do lugar para dormir, você oferece:
          </p>
          {EXTRAS.map(item => (
            <div key={item.key} style={styles.checkRow}>
              <input
                id={`ac-${item.key}`}
                type="checkbox"
                checked={value[item.key] === true}
                onChange={event => set(item.key, event.target.checked as never)}
                disabled={disabled}
              />
              <label style={styles.checkLabel} htmlFor={`ac-${item.key}`}>
                {item.label}
              </label>
            </div>
          ))}

          <div style={styles.field}>
            <label style={styles.label} htmlFor="ac-address">
              Endereço de onde a pessoa vai ficar
            </label>
            <input
              id="ac-address"
              style={styles.input}
              value={value.address}
              onChange={event => set("address", event.target.value)}
              placeholder="Rua, número e bairro"
              disabled={disabled}
            />
            <p style={styles.hint}>
              Vem do seu cadastro. Se a pessoa vai ficar em outro lugar — a casa da sua
              mãe, um sítio —, troque aqui.
            </p>
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="ac-phone">
              Telefone de contato
            </label>
            <input
              id="ac-phone"
              style={styles.input}
              inputMode="tel"
              value={formatPhoneBR(value.contactPhone)}
              onChange={event =>
                set("contactPhone", applyPhoneInput(event.target.value, value.contactPhone).digits)
              }
              placeholder="(16) 9XXXX-XXXX"
              disabled={disabled}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="ac-notes">
              Alguma coisa que a organização precisa saber? (opcional)
            </label>
            <textarea
              id="ac-notes"
              style={{ ...styles.input, ...styles.textarea }}
              value={value.notes}
              onChange={event => set("notes", event.target.value)}
              placeholder="Ex.: tenho cachorro, só depois das 18h, a escada é íngreme"
              disabled={disabled}
            />
          </div>

          <p style={styles.hint}>
            Nada disso aparece no site. Só a organização vê, e ela fala com você antes de
            mandar alguém.
          </p>
        </>
      )}
    </div>
  );
};

interface AcolhimentoResumoProps {
  hosting: HostingEligibility;
  onChanged: (offer: HostingOffer | null) => void;
  onSessionExpired: () => void;
}

/**
 * Depois de inscrita: o que ela combinou, com mudar e desistir — e, para quem
 * não marcou a caixinha na hora, a porta de quem se lembrou depois.
 */
export const AcolhimentoResumo: React.FC<AcolhimentoResumoProps> = ({
  hosting,
  onChanged,
  onSessionExpired,
}) => {
  const offer = hosting.offer && hosting.offer.status === "ATIVO" ? hosting.offer : null;
  const [isEditing, setIsEditing] = React.useState(false);
  const [form, setForm] = React.useState<HostingInput>(() =>
    offer ? hostingInputFrom(offer) : emptyHostingInput(hosting)
  );
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!hosting.eligible) return null;

  const openEditor = () => {
    setError(null);
    setForm(offer ? hostingInputFrom(offer) : emptyHostingInput(hosting));
    setIsEditing(true);
  };

  const run = async (action: () => Promise<{ offer: HostingOffer | null }>) => {
    setIsBusy(true);
    setError(null);
    try {
      const result = await action();
      onChanged(result.offer);
      setIsEditing(false);
    } catch (actionError) {
      if (actionError instanceof SessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError(messageForError(actionError));
    } finally {
      setIsBusy(false);
    }
  };

  if (isEditing) {
    return (
      <div style={styles.box}>
        <p style={styles.boxTitle}>{offer ? "Mudar meu acolhimento" : "Quero acolher alguém"}</p>
        <AcolhimentoFields
          hosting={hosting}
          enabled
          onToggle={() => undefined}
          value={form}
          onChange={setForm}
          disabled={isBusy}
          showIntro={false}
        />
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.actionsRow}>
          <button
            type="button"
            style={{ ...styles.goldButton, marginTop: 0, ...(isBusy ? styles.buttonOff : {}) }}
            onClick={() => run(() => saveHosting(form))}
            disabled={isBusy}
          >
            {isBusy ? "Salvando..." : "Salvar meu acolhimento"}
          </button>
          <button
            type="button"
            style={styles.ghostButton}
            onClick={() => setIsEditing(false)}
            disabled={isBusy}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div style={styles.box}>
        <p style={styles.boxTitle}>Acolhimento</p>
        <p style={styles.help}>
          Você mora em <strong>{hosting.cityLabel}</strong>,{" "}
          {distanceSentence(hosting.city)}. Se sobrar um canto na sua casa, ainda dá para
          receber um peregrino que vem de longe.
        </p>
        {error && <div style={styles.error}>{error}</div>}
        <button type="button" style={styles.goldButton} onClick={openEditor}>
          Quero acolher alguém
        </button>
      </div>
    );
  }

  return (
    <div style={styles.box}>
      <p style={styles.boxTitle}>Acolhimento</p>
      <p style={styles.help}>
        Obrigado por abrir sua casa. A organização fala com você antes do evento para
        combinar quem fica aí.
      </p>

      <div style={{ marginTop: 10 }}>
        <ReadRow
          label="Quantas pessoas"
          value={`${offer.spots} ${offer.spots === 1 ? "pessoa" : "pessoas"}`}
        />
        <ReadRow label="Prefere receber" value={GENDER_LABEL[offer.genderPreference]} />
        <ReadRow label="Você oferece" value={extrasOf(offer)} />
        <ReadRow label="Onde" value={`${offer.address} — ${offer.cityLabel}`} />
        <ReadRow label="Contato" value={formatPhoneBR(offer.contactPhone)} />
        {offer.notes && <ReadRow label="Observações" value={offer.notes} />}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.actionsRow}>
        <button type="button" style={styles.ghostButton} onClick={openEditor} disabled={isBusy}>
          Mudar meu acolhimento
        </button>
        <button
          type="button"
          style={{ ...styles.dangerButton, ...(isBusy ? styles.buttonOff : {}) }}
          onClick={() => run(cancelHosting)}
          disabled={isBusy}
        >
          {isBusy ? "Cancelando..." : "Não posso mais receber"}
        </button>
      </div>
    </div>
  );
};

const ReadRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={styles.readRow}>
    <p style={styles.readLabel}>{label}</p>
    <p style={styles.readValue}>{value || "—"}</p>
  </div>
);
