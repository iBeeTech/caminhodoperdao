import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FormField, Input, Select } from "../../components";
import { formatCpfBR } from "../../utils/formatters/cpf";
import { formatPhoneBR } from "../../utils/formatters/phone";
import { formatCepBR } from "../../utils/formatters/cep";
import { canonicalizeCpf, isValidCpf } from "../../utils/validators/cpf";
import {
  ErrorText,
  FieldRow,
  PrimaryButton,
  RadioRow,
  SecondaryButton,
  SignupForm,
  StaffBanner,
  StaffCard,
  StaffContainer,
  StaffPage,
  StaffSubtitle,
  StaffTitle,
  SuccessBanner,
  SuccessText,
  TermsLabel,
} from "./Staff.styles";

type YesNo = "" | "yes" | "no";

interface FormState {
  name: string;
  email: string;
  cpf: string;
  dateOfBirth: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  sleepAtMonastery: YesNo;
  companionName: string;
  allergyMedication: YesNo;
  allergyMedicationDetails: string;
  dietaryRestriction: YesNo;
  dietaryRestrictionDetails: string;
  termsAccepted: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  cpf: "",
  dateOfBirth: "",
  phone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  city: "",
  state: "",
  sleepAtMonastery: "",
  companionName: "",
  allergyMedication: "",
  allergyMedicationDetails: "",
  dietaryRestriction: "",
  dietaryRestrictionDetails: "",
  termsAccepted: false,
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Email inválido.",
  invalid_phone: "Telefone inválido.",
  invalid_cpf: "CPF inválido.",
  name_required: "Informe o nome completo.",
  date_of_birth_required: "Informe a data de nascimento.",
  invalid_date_of_birth: "Data de nascimento inválida.",
  date_of_birth_future: "Data de nascimento não pode ser no futuro.",
  date_of_birth_invalid_range: "Data de nascimento fora do intervalo válido.",
  terms_required: "É necessário aceitar os termos.",
  emergency_contact_name_required: "Informe o nome do contato de emergência.",
  emergency_contact_phone_invalid: "Telefone de emergência inválido (11 dígitos).",
  emergency_contact_phone_same_as_registration_phone:
    "O telefone de emergência deve ser diferente do seu telefone.",
  allergy_medication_details_required: "Descreva a medicação/alergia.",
  dietary_restriction_details_required: "Descreva a restrição alimentar.",
  cpf_already_registered: "Este CPF já está inscrito com outro nome.",
  registration_exists: "Este CPF já possui inscrição confirmada.",
  monastery_full: "As vagas do mosteiro estão esgotadas.",
  registrations_full: "As vagas estão esgotadas.",
  cpf_encryption_not_configured: "Erro de configuração no servidor. Avise a organização.",
  staff_registration_failed: "Não foi possível concluir a inscrição. Tente novamente.",
  staff_update_failed: "Não foi possível salvar as alterações. Tente novamente.",
};

const StaffPageComponent: React.FC = () => {
  const { t } = useTranslation("landing");
  const rf = (key: string) => t(`signup.registrationForm.${key}`);

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [registrationNumber, setRegistrationNumber] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // Ao sair do campo CPF (modo criação), verifica se já existe inscrição de staff
  // para esse CPF. Se existir, carrega os dados para edição.
  const handleCpfBlur = async () => {
    if (mode === "edit") return;
    const digits = canonicalizeCpf(form.cpf);
    if (!isValidCpf(digits)) return;
    try {
      const response = await fetch(`/api/staff/registration?cpf=${encodeURIComponent(digits)}`);
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
        found?: boolean;
      };
      if (!data.found) return;
      setForm({
        name: (data.name as string) ?? "",
        email: (data.email as string) ?? "",
        cpf: formatCpfBR((data.cpf as string) ?? digits),
        dateOfBirth: (data.dateOfBirth as string) ?? "",
        phone: formatPhoneBR((data.phone as string) ?? ""),
        emergencyContactName: (data.emergencyContactName as string) ?? "",
        emergencyContactPhone: formatPhoneBR((data.emergencyContactPhone as string) ?? ""),
        cep: (data.cep as string) ?? "",
        address: (data.address as string) ?? "",
        number: (data.number as string) ?? "",
        complement: (data.complement as string) ?? "",
        city: (data.city as string) ?? "",
        state: (data.state as string) ?? "",
        sleepAtMonastery: data.sleepAtMonastery === true ? "yes" : "no",
        companionName: (data.companionName as string) ?? "",
        allergyMedication: data.hasAllergyMedication === true ? "yes" : "no",
        allergyMedicationDetails: (data.allergyMedicationDetails as string) ?? "",
        dietaryRestriction: data.hasDietaryRestriction === true ? "yes" : "no",
        dietaryRestrictionDetails: (data.dietaryRestrictionDetails as string) ?? "",
        termsAccepted: true,
      });
      setRegistrationNumber((data.registrationNumber as string) ?? null);
      setMode("edit");
      setErrors({});
      setFormError(null);
      setSavedMessage(null);
    } catch {
      /* silencioso: segue como inscrição nova */
    }
  };

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!form.name.trim()) e.name = "Obrigatório";
    if (mode === "create") {
      if (!form.email.trim()) e.email = "Obrigatório";
      if (!isValidCpf(canonicalizeCpf(form.cpf))) e.cpf = "CPF inválido";
    }
    if (!form.dateOfBirth) e.dateOfBirth = "Obrigatório";
    if (!form.phone.trim()) e.phone = "Obrigatório";
    if (!form.emergencyContactName.trim()) e.emergencyContactName = "Obrigatório";
    if (canonicalizeCpf(form.emergencyContactPhone).length < 10) {
      e.emergencyContactPhone = "Telefone inválido";
    }
    if (!form.sleepAtMonastery) e.sleepAtMonastery = "Selecione";
    if (!form.allergyMedication) e.allergyMedication = "Selecione";
    if (form.allergyMedication === "yes" && !form.allergyMedicationDetails.trim()) {
      e.allergyMedicationDetails = "Descreva";
    }
    if (!form.dietaryRestriction) e.dietaryRestriction = "Selecione";
    if (form.dietaryRestriction === "yes" && !form.dietaryRestrictionDetails.trim()) {
      e.dietaryRestrictionDetails = "Descreva";
    }
    if (!form.termsAccepted) e.termsAccepted = "Aceite os termos";
    return e;
  };

  const buildPayload = () => ({
    name: form.name,
    email: form.email,
    cpf: canonicalizeCpf(form.cpf),
    dateOfBirth: form.dateOfBirth,
    phone: form.phone,
    emergencyContactName: form.emergencyContactName,
    emergencyContactPhone: form.emergencyContactPhone,
    cep: form.cep,
    address: form.address,
    number: form.number,
    complement: form.complement,
    city: form.city,
    state: form.state,
    sleepAtMonastery: form.sleepAtMonastery === "yes",
    companionName: form.companionName,
    hasAllergyMedication: form.allergyMedication === "yes",
    allergyMedicationDetails: form.allergyMedicationDetails,
    hasDietaryRestriction: form.dietaryRestriction === "yes",
    dietaryRestrictionDetails: form.dietaryRestrictionDetails,
    termsAccepted: form.termsAccepted,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSavedMessage(null);

    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setIsSubmitting(true);
    try {
      const isEditSubmit = mode === "edit";
      const url = isEditSubmit ? "/api/staff/registration" : "/api/staff/register";
      const response = await fetch(url, {
        method: isEditSubmit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        registration_number?: string;
      };
      if (!response.ok) {
        setFormError(
          ERROR_MESSAGES[data.error ?? ""] ||
            (isEditSubmit
              ? "Não foi possível salvar as alterações."
              : "Não foi possível concluir a inscrição.")
        );
        return;
      }
      if (isEditSubmit) {
        setSavedMessage("Alterações salvas com sucesso.");
      } else {
        setRegistrationNumber(data.registration_number ?? null);
        setMode("edit");
        setSavedMessage("Inscrição concluída com sucesso.");
      }
    } catch {
      setFormError("Não foi possível enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = mode === "edit";

  return (
    <StaffPage>
      <StaffContainer>
        <StaffBanner>Essa página é apenas para Staff</StaffBanner>

        <StaffCard>
          {isEdit ? (
            <>
              <SuccessBanner>
                Inscrição realizada com sucesso
                {registrationNumber ? ` — Nº ${registrationNumber}` : ""}!
              </SuccessBanner>
              <StaffSubtitle>
                Confira seus dados abaixo. Você pode editar e salvar as alterações (email e CPF
                não podem ser alterados).
              </StaffSubtitle>
            </>
          ) : (
            <>
              <StaffTitle>Inscrição de Staff (gratuita)</StaffTitle>
              <StaffSubtitle>Preencha seus dados para concluir a inscrição.</StaffSubtitle>
            </>
          )}

          <SignupForm noValidate onSubmit={handleSubmit}>
            <FormField label={rf("nameLabel")} htmlFor="name" error={errors.name} required>
              <Input
                id="name"
                type="text"
                value={form.name}
                placeholder={rf("namePlaceholder")}
                onChange={e => update("name", e.target.value)}
                autoComplete="name"
              />
            </FormField>

            <FormField label={rf("cpfLabel")} htmlFor="cpf" error={errors.cpf} required>
              <Input
                id="cpf"
                type="text"
                value={form.cpf}
                placeholder={rf("cpfPlaceholder")}
                onChange={e => update("cpf", formatCpfBR(e.target.value))}
                onBlur={handleCpfBlur}
                inputMode="numeric"
                disabled={isEdit}
              />
            </FormField>

            <FormField label={rf("emailLabel")} htmlFor="email" error={errors.email} required>
              <Input
                id="email"
                type="email"
                value={form.email}
                placeholder={rf("emailPlaceholder")}
                onChange={e => update("email", e.target.value)}
                autoComplete="email"
                disabled={isEdit}
              />
            </FormField>

            <FormField
              label={rf("dateOfBirthLabel")}
              htmlFor="dateOfBirth"
              error={errors.dateOfBirth}
              required
            >
              <Input
                id="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={e => update("dateOfBirth", e.target.value)}
              />
            </FormField>

            <FormField label={rf("whatsappLabel")} htmlFor="phone" error={errors.phone} required>
              <Input
                id="phone"
                type="text"
                value={form.phone}
                placeholder={rf("whatsappPlaceholder")}
                onChange={e => update("phone", formatPhoneBR(e.target.value))}
                inputMode="tel"
              />
            </FormField>

            <FormField
              label={rf("emergencyContactNameLabel")}
              htmlFor="emergencyContactName"
              error={errors.emergencyContactName}
              required
            >
              <Input
                id="emergencyContactName"
                type="text"
                value={form.emergencyContactName}
                placeholder={rf("emergencyContactNamePlaceholder")}
                onChange={e => update("emergencyContactName", e.target.value)}
                autoComplete="name"
              />
            </FormField>

            <FormField
              label={rf("emergencyContactPhoneLabel")}
              htmlFor="emergencyContactPhone"
              error={errors.emergencyContactPhone}
              required
            >
              <Input
                id="emergencyContactPhone"
                type="text"
                value={form.emergencyContactPhone}
                placeholder={rf("emergencyContactPhonePlaceholder")}
                onChange={e => update("emergencyContactPhone", formatPhoneBR(e.target.value))}
                inputMode="tel"
              />
            </FormField>

            <FormField label={rf("cepLabel")} htmlFor="cep" error={errors.cep}>
              <Input
                id="cep"
                type="text"
                value={form.cep}
                placeholder={rf("cepPlaceholder")}
                onChange={e => update("cep", formatCepBR(e.target.value))}
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </FormField>

            <FormField label={rf("addressLabel")} htmlFor="address" error={errors.address}>
              <Input
                id="address"
                type="text"
                value={form.address}
                placeholder={rf("addressPlaceholder")}
                onChange={e => update("address", e.target.value)}
                autoComplete="street-address"
              />
            </FormField>

            <FieldRow>
              <FormField label={rf("numberLabel")} htmlFor="number" error={errors.number}>
                <Input
                  id="number"
                  type="text"
                  value={form.number}
                  placeholder={rf("numberPlaceholder")}
                  onChange={e => update("number", e.target.value)}
                  inputMode="numeric"
                />
              </FormField>
              <FormField label={rf("complementLabel")} htmlFor="complement">
                <Input
                  id="complement"
                  type="text"
                  value={form.complement}
                  placeholder={rf("complementPlaceholder")}
                  onChange={e => update("complement", e.target.value)}
                />
              </FormField>
            </FieldRow>

            <FieldRow>
              <FormField label={rf("cityLabel")} htmlFor="city" error={errors.city}>
                <Input
                  id="city"
                  type="text"
                  value={form.city}
                  placeholder={rf("cityPlaceholder")}
                  onChange={e => update("city", e.target.value)}
                  autoComplete="address-level2"
                />
              </FormField>
              <FormField label={rf("stateLabel")} htmlFor="state" error={errors.state}>
                <Input
                  id="state"
                  type="text"
                  maxLength={2}
                  value={form.state}
                  placeholder={rf("statePlaceholder")}
                  onChange={e => update("state", e.target.value.toUpperCase())}
                  autoComplete="address-level1"
                />
              </FormField>
            </FieldRow>

            <FormField
              label={rf("sleepQuestion")}
              htmlFor="sleepAtMonastery"
              error={errors.sleepAtMonastery}
              required
            >
              <Select
                id="sleepAtMonastery"
                value={form.sleepAtMonastery}
                onChange={e => update("sleepAtMonastery", e.target.value as YesNo)}
              >
                <option value="" disabled>
                  {rf("sleepPlaceholder")}
                </option>
                <option value="yes">{rf("sleepYes")}</option>
                <option value="no">{rf("sleepNo")}</option>
              </Select>
            </FormField>

            {form.sleepAtMonastery === "yes" && (
              <FormField label={`${rf("companionBeforeGroup")} ${rf("companionGroup")}`} htmlFor="companionName">
                <Input
                  id="companionName"
                  type="text"
                  value={form.companionName}
                  placeholder={rf("companionPlaceholder")}
                  onChange={e => update("companionName", e.target.value)}
                />
              </FormField>
            )}

            <FormField
              label={rf("allergyMedicationQuestion")}
              htmlFor="allergyMedicationYes"
              error={errors.allergyMedication}
              required
            >
              <RadioRow>
                <label>
                  <input
                    id="allergyMedicationYes"
                    type="radio"
                    name="allergyMedication"
                    checked={form.allergyMedication === "yes"}
                    onChange={() => update("allergyMedication", "yes")}
                  />
                  {rf("yes")}
                </label>
                <label>
                  <input
                    type="radio"
                    name="allergyMedication"
                    checked={form.allergyMedication === "no"}
                    onChange={() => update("allergyMedication", "no")}
                  />
                  {rf("no")}
                </label>
              </RadioRow>
            </FormField>
            {form.allergyMedication === "yes" && (
              <FormField
                label={rf("allergyMedicationPlaceholder")}
                htmlFor="allergyMedicationDetails"
                error={errors.allergyMedicationDetails}
              >
                <Input
                  id="allergyMedicationDetails"
                  type="text"
                  value={form.allergyMedicationDetails}
                  placeholder={rf("allergyMedicationPlaceholder")}
                  onChange={e => update("allergyMedicationDetails", e.target.value)}
                />
              </FormField>
            )}

            <FormField
              label={rf("dietaryRestrictionQuestion")}
              htmlFor="dietaryRestrictionYes"
              error={errors.dietaryRestriction}
              required
            >
              <RadioRow>
                <label>
                  <input
                    id="dietaryRestrictionYes"
                    type="radio"
                    name="dietaryRestriction"
                    checked={form.dietaryRestriction === "yes"}
                    onChange={() => update("dietaryRestriction", "yes")}
                  />
                  {rf("yes")}
                </label>
                <label>
                  <input
                    type="radio"
                    name="dietaryRestriction"
                    checked={form.dietaryRestriction === "no"}
                    onChange={() => update("dietaryRestriction", "no")}
                  />
                  {rf("no")}
                </label>
              </RadioRow>
            </FormField>
            {form.dietaryRestriction === "yes" && (
              <FormField
                label={rf("dietaryRestrictionPlaceholder")}
                htmlFor="dietaryRestrictionDetails"
                error={errors.dietaryRestrictionDetails}
              >
                <Input
                  id="dietaryRestrictionDetails"
                  type="text"
                  value={form.dietaryRestrictionDetails}
                  placeholder={rf("dietaryRestrictionPlaceholder")}
                  onChange={e => update("dietaryRestrictionDetails", e.target.value)}
                />
              </FormField>
            )}

            <div>
              <TermsLabel htmlFor="termsAccepted">
                <input
                  id="termsAccepted"
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={e => update("termsAccepted", e.target.checked)}
                />
                <span>
                  {rf("termsLabel")}{" "}
                  <Link to="/responsabilityTerms">{rf("termsLinkText")}</Link>.
                </span>
              </TermsLabel>
              {errors.termsAccepted && <ErrorText>{errors.termsAccepted}</ErrorText>}
            </div>

            {formError && <ErrorText>{formError}</ErrorText>}
            {savedMessage && <SuccessText>{savedMessage}</SuccessText>}

            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Enviando..."
                : isEdit
                ? "Salvar alterações"
                : "Concluir inscrição gratuita"}
            </PrimaryButton>

            {isEdit && (
              <SecondaryButton
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setMode("create");
                  setRegistrationNumber(null);
                  setErrors({});
                  setFormError(null);
                  setSavedMessage(null);
                }}
              >
                Nova inscrição
              </SecondaryButton>
            )}
          </SignupForm>
        </StaffCard>
      </StaffContainer>
    </StaffPage>
  );
};

export default StaffPageComponent;
