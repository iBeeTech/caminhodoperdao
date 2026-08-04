import React from "react";
import { theme } from "../../../styles/theme";
import { useAddressByCep } from "../../../hooks/useAddressByCep";
import { applyPhoneInput, formatPhoneBR, stripCountryCode } from "../../../utils/formatters/phone";
import { applyCpfInput, formatCpfBR } from "../../../utils/formatters/cpf";
import { applyCepInput, formatCepBR } from "../../../utils/formatters/cep";
import { PilgrimProfile } from "../api";

/**
 * O formulário de cadastro do peregrino.
 *
 * Vive fora das telas porque aparece em DOIS lugares — no primeiro acesso
 * (`/dashboard`) e no `/perfil` — e são o mesmo formulário. Duas cópias
 * divergiriam no primeiro campo novo, e o campo esquecido seria justamente o
 * que a inscrição precisa.
 *
 * O CEP preenche endereço, cidade e estado sozinho (ViaCEP), reaproveitando o
 * `useAddressByCep` que a inscrição da home já usava. Antes disso a pessoa
 * digitava o CEP e ficava olhando para três campos vazios, sem entender que
 * ainda tinha de preencher tudo à mão.
 */

const c = theme.colors;

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  wide: { gridColumn: "1 / -1" },
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
  inputLocked: { background: "#f3f4f6", color: c.muted, cursor: "not-allowed" },
  hint: { color: c.muted, fontSize: 12, lineHeight: 1.5, margin: "2px 0 0" },
  hintLink: { color: c.secondary, fontWeight: 700 },
  cepStatus: { color: c.secondary, fontSize: 12, margin: "2px 0 0" },
  // O PIX ganha moldura própria: não é dado de identificação como os de cima,
  // é para onde o dinheiro volta. Misturado com "cidade" e "número", ninguém
  // entende por que o site está pedindo isso.
  pixBox: {
    gridColumn: "1 / -1",
    border: `1px solid ${c.border}`,
    borderRadius: theme.radius.md,
    padding: "14px 16px",
    background: theme.colors.background,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  pixTitle: {
    gridColumn: "1 / -1",
    fontWeight: 800,
    fontSize: 14,
    color: c.primary,
    margin: 0,
  },
  pixHelp: {
    gridColumn: "1 / -1",
    color: c.muted,
    fontSize: 12,
    lineHeight: 1.6,
    margin: "-6px 0 0",
  },
  cepError: { color: "#b91c1c", fontSize: 12, margin: "2px 0 0" },
  checkRow: { display: "flex", alignItems: "center", gap: 8 },
};

const GENDERS = [
  { value: "", label: "Prefiro não informar" },
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
];

const CEP_LENGTH = 8;

const PHONE_PLACEHOLDER = "(16) 9XXXX-XXXX";
// Exemplos inventados de propósito: número real de gente de verdade não entra
// como placeholder nem para ilustrar.
const CPF_PLACEHOLDER = "123.456.789-00";
const CEP_PLACEHOLDER = "12.345-678";
const COUNTRY_CODE_WARNING = "Código de área do Brasil +55 não é necessário.";

const PIX_TYPES = [
  { value: "", label: "Não quero informar agora" },
  { value: "cpf", label: "CPF" },
  { value: "celular", label: "Celular" },
  { value: "email", label: "E-mail" },
  { value: "aleatoria", label: "Chave aleatória" },
];

interface ProfileFormProps {
  value: PilgrimProfile;
  onChange: (next: PilgrimProfile) => void;
  /** CPF já cadastrado (mascarado). Quando existe, o campo trava. */
  cpfMasked: string | null;
  hasCpf: boolean;
  cpfInput: string;
  onCpfInputChange: (digits: string) => void;
  whatsappUrl: string | null;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  value,
  onChange,
  cpfMasked,
  hasCpf,
  cpfInput,
  onCpfInputChange,
  whatsappUrl,
}) => {
  const { fetchAddress, loading: isLookingUpCep, error: cepError } = useAddressByCep();
  // Guarda o último CEP já consultado para não repetir a chamada a cada tecla
  // depois do oitavo dígito (apagar e redigitar o mesmo número é comum).
  const lastLookedUpCep = React.useRef<string>("");

  const set = <K extends keyof PilgrimProfile>(key: K, fieldValue: PilgrimProfile[K]) =>
    onChange({ ...value, [key]: fieldValue });

  // Um aviso por campo: o 55 pode ter sido colado só num deles.
  const [countryCodeWarning, setCountryCodeWarning] = React.useState<{
    phone: boolean;
    emergency: boolean;
  }>({ phone: false, emergency: false });

  const isEmergencyPhoneOwn =
    value.phone.length > 0 && value.phone === value.emergencyContactPhone;

  const handleCepChange = async (raw: string) => {
    const digits = applyCepInput(raw, value.cep);
    onChange({ ...value, cep: digits });

    if (digits.length !== CEP_LENGTH) {
      lastLookedUpCep.current = "";
      return;
    }
    if (lastLookedUpCep.current === digits) return;
    lastLookedUpCep.current = digits;

    const address = await fetchAddress(digits);
    if (!address) return;

    // Só o que o ViaCEP realmente devolveu, e sem apagar o que a pessoa já
    // escreveu: CEP de cidade pequena costuma vir sem logradouro, e sobrescrever
    // com string vazia apagaria o endereço digitado à mão.
    onChange({
      ...value,
      cep: digits,
      address: address.street || value.address,
      city: address.city || value.city,
      state: address.state || value.state,
    });
  };

  return (
    <div style={styles.grid}>
      <div style={{ ...styles.field, ...styles.wide }}>
        <label style={styles.label} htmlFor="pf-name">
          Nome completo
        </label>
        <input
          id="pf-name"
          style={styles.input}
          value={value.name}
          onChange={e => set("name", e.target.value)}
          autoComplete="name"
        />
      </div>

      <div style={{ ...styles.field, ...styles.wide }}>
        <label style={styles.label} htmlFor="pf-cpf">
          CPF
        </label>
        <input
          id="pf-cpf"
          style={{ ...styles.input, ...(hasCpf ? styles.inputLocked : {}) }}
          value={hasCpf ? cpfMasked ?? "cadastrado" : formatCpfBR(cpfInput)}
          onChange={e => onCpfInputChange(applyCpfInput(e.target.value, cpfInput))}
          readOnly={hasCpf}
          inputMode="numeric"
          placeholder={hasCpf ? "" : CPF_PLACEHOLDER}
        />
        <p style={styles.hint}>
          {hasCpf
            ? "Se você precisa editar o CPF entre em contato conosco por WhatsApp"
            : "O CPF entra uma vez só. Depois, para corrigir, fale conosco por WhatsApp."}
          {whatsappUrl && (
            <>
              {" "}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.hintLink}
              >
                Falar no WhatsApp
              </a>
            </>
          )}
        </p>
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="pf-phone">
          Telefone
        </label>
        <input
          id="pf-phone"
          style={styles.input}
          value={formatPhoneBR(value.phone)}
          onChange={e => {
            const { digits, hadCountryCode } = applyPhoneInput(e.target.value, value.phone);
            setCountryCodeWarning(current => ({ ...current, phone: hadCountryCode }));
            set("phone", digits);
          }}
          inputMode="numeric"
          placeholder={PHONE_PLACEHOLDER}
          autoComplete="tel"
        />
        {countryCodeWarning.phone && <p style={styles.cepStatus}>{COUNTRY_CODE_WARNING}</p>}
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="pf-dob">
          Data de nascimento
        </label>
        <input
          id="pf-dob"
          style={styles.input}
          type="date"
          value={value.dateOfBirth}
          onChange={e => set("dateOfBirth", e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="pf-gender">
          Sexo
        </label>
        <select
          id="pf-gender"
          style={styles.input}
          value={value.gender}
          onChange={e => set("gender", e.target.value)}
        >
          {GENDERS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="pf-cep">
          CEP
        </label>
        <input
          id="pf-cep"
          style={styles.input}
          value={formatCepBR(value.cep)}
          onChange={e => handleCepChange(e.target.value)}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder={CEP_PLACEHOLDER}
        />
        {isLookingUpCep && <p style={styles.cepStatus}>Buscando endereço...</p>}
        {!isLookingUpCep && cepError && <p style={styles.cepError}>{cepError}</p>}
      </div>

      <div style={{ ...styles.field, ...styles.wide }}>
        <label style={styles.label} htmlFor="pf-address">
          Endereço
        </label>
        <input
          id="pf-address"
          style={styles.input}
          value={value.address}
          onChange={e => set("address", e.target.value)}
          autoComplete="street-address"
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="pf-number">
          Número
        </label>
        <input
          id="pf-number"
          style={styles.input}
          value={value.number}
          onChange={e => set("number", e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="pf-complement">
          Complemento
        </label>
        <input
          id="pf-complement"
          style={styles.input}
          value={value.complement}
          onChange={e => set("complement", e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="pf-city">
          Cidade
        </label>
        <input
          id="pf-city"
          style={styles.input}
          value={value.city}
          onChange={e => set("city", e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="pf-state">
          Estado (sigla)
        </label>
        <input
          id="pf-state"
          style={styles.input}
          value={value.state}
          onChange={e =>
            set("state", e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2))
          }
          placeholder="MG"
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="pf-emergency-name">
          Contato de emergência
        </label>
        <input
          id="pf-emergency-name"
          style={styles.input}
          value={value.emergencyContactName}
          onChange={e => set("emergencyContactName", e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="pf-emergency-phone">
          Telefone da emergência
        </label>
        <input
          id="pf-emergency-phone"
          style={{
            ...styles.input,
            ...(isEmergencyPhoneOwn ? { borderColor: "#b91c1c" } : {}),
          }}
          value={formatPhoneBR(value.emergencyContactPhone)}
          onChange={e => {
            const { digits, hadCountryCode } = applyPhoneInput(
              e.target.value,
              value.emergencyContactPhone
            );
            setCountryCodeWarning(current => ({ ...current, emergency: hadCountryCode }));
            set("emergencyContactPhone", digits);
          }}
          inputMode="numeric"
          placeholder={PHONE_PLACEHOLDER}
        />
        {countryCodeWarning.emergency && (
          <p style={styles.cepStatus}>{COUNTRY_CODE_WARNING}</p>
        )}
        {/* Avisa na digitação, e não só ao salvar: descobrir o erro depois de
            preencher a tela inteira é o tipo de coisa que faz desistir. */}
        {isEmergencyPhoneOwn && (
          <p style={styles.cepError}>
            O contato de emergência não pode ser o seu próprio número.
          </p>
        )}
      </div>

      <div style={styles.pixBox}>
        <p style={styles.pixTitle}>Chave PIX para devolução</p>
        <p style={styles.pixHelp}>
          Guardamos para dois casos: se você cancelar e tivermos de devolver o valor, e
          se você passar sua inscrição para outra pessoa. Sem a chave no cadastro, a
          devolução vira conversa no WhatsApp na hora em que ninguém quer conversar.
        </p>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="pf-pix-type">
            Tipo da chave
          </label>
          <select
            id="pf-pix-type"
            style={styles.input}
            value={value.refundPixType}
            onChange={e =>
              // Trocar o tipo limpa a chave: um CPF sobrando no campo depois de
              // mudar para "e-mail" seria salvo como e-mail e reprovado.
              onChange({ ...value, refundPixType: e.target.value, refundPixKey: "" })
            }
          >
            {PIX_TYPES.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="pf-pix-key">
            Chave PIX
          </label>
          <input
            id="pf-pix-key"
            style={{ ...styles.input, ...(value.refundPixType ? {} : styles.inputLocked) }}
            value={value.refundPixKey}
            disabled={!value.refundPixType}
            inputMode={
              value.refundPixType === "cpf" || value.refundPixType === "celular"
                ? "numeric"
                : "text"
            }
            placeholder={
              value.refundPixType === "cpf"
                ? "somente números"
                : value.refundPixType === "celular"
                  ? "DDD + número"
                  : value.refundPixType === "email"
                    ? "seu@email.com"
                    : value.refundPixType === "aleatoria"
                      ? "cole a chave aleatória"
                      : "escolha o tipo ao lado"
            }
            onChange={e =>
              set(
                "refundPixKey",
                value.refundPixType === "cpf" || value.refundPixType === "celular"
                  ? stripCountryCode(e.target.value).digits
                  : e.target.value
              )
            }
          />
        </div>
      </div>

      <div style={{ ...styles.field, ...styles.wide }}>
        <div style={styles.checkRow}>
          <input
            id="pf-allergy"
            type="checkbox"
            checked={value.hasAllergyMedication}
            onChange={e => set("hasAllergyMedication", e.target.checked)}
          />
          <label style={styles.label} htmlFor="pf-allergy">
            Tenho alergia ou uso medicação
          </label>
        </div>
        {value.hasAllergyMedication && (
          <input
            style={styles.input}
            value={value.allergyMedicationDetails}
            onChange={e => set("allergyMedicationDetails", e.target.value)}
            placeholder="Qual alergia / qual medicação"
            aria-label="Detalhes da alergia ou medicação"
          />
        )}
      </div>

      <div style={{ ...styles.field, ...styles.wide }}>
        <div style={styles.checkRow}>
          <input
            id="pf-diet"
            type="checkbox"
            checked={value.hasDietaryRestriction}
            onChange={e => set("hasDietaryRestriction", e.target.checked)}
          />
          <label style={styles.label} htmlFor="pf-diet">
            Tenho restrição alimentar
          </label>
        </div>
        {value.hasDietaryRestriction && (
          <input
            style={styles.input}
            value={value.dietaryRestrictionDetails}
            onChange={e => set("dietaryRestrictionDetails", e.target.value)}
            placeholder="Qual restrição"
            aria-label="Detalhes da restrição alimentar"
          />
        )}
      </div>
    </div>
  );
};

export default ProfileForm;
