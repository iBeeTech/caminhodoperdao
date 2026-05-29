import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FormField, Input, Select } from "../../components";
import { formatCpfBR } from "../../utils/formatters/cpf";
import { formatPhoneBR } from "../../utils/formatters/phone";
import { formatCepBR } from "../../utils/formatters/cep";
import { canonicalizeCpf, isValidCpf } from "../../utils/validators/cpf";
import { useAddressByCep } from "../../hooks/useAddressByCep";
import {
  BackButton,
  DangerButton,
  ErrorText,
  FieldRow,
  IntentButton,
  IntentGrid,
  IntentTitle,
  ModalActions,
  ModalDialog,
  ModalOverlay,
  ModalText,
  ModalTitle,
  MotivationCard,
  MotivationMessage,
  MotivationVerse,
  MotivationVerseRef,
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

type Step = "intent" | "registerCheck" | "register" | "check" | "edit";
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

const StaffPageComponent: React.FC = () => {
  const { t } = useTranslation("staff");
  const { t: tl } = useTranslation("landing");
  const { t: tc } = useTranslation("common");
  const rf = (key: string) => tl(`signup.registrationForm.${key}`);
  const errorMessage = (code?: string) =>
    (code && t(`errors.${code}`) !== `errors.${code}` ? t(`errors.${code}`) : t("genericError"));
  const { fetchAddress } = useAddressByCep();

  const [step, setStep] = React.useState<Step>("intent");
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [registrationNumber, setRegistrationNumber] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null);
  const [topMessage, setTopMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // Formata o CEP e, com 8 dígitos, busca o endereço (ViaCEP) e preenche os campos.
  const handleCepChange = async (raw: string) => {
    const formatted = formatCepBR(raw);
    update("cep", formatted);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      const address = await fetchAddress(digits);
      if (address) {
        setForm(prev => ({
          ...prev,
          address: address.street || prev.address,
          city: address.city || prev.city,
          state: address.state || prev.state,
        }));
      }
    }
  };

  const resetAll = (nextStep: Step) => {
    setForm(EMPTY_FORM);
    setRegistrationNumber(null);
    setErrors({});
    setFormError(null);
    setSavedMessage(null);
    setStep(nextStep);
  };

  const fillFromData = (data: Record<string, unknown>) => {
    setForm({
      name: (data.name as string) ?? "",
      email: (data.email as string) ?? "",
      cpf: formatCpfBR((data.cpf as string) ?? ""),
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
  };

  // Busca inscrição de staff por CPF. Retorna se há inscrição de staff (found),
  // se o CPF já é peregrino ativo (peregrino) e os dados quando encontrados.
  const lookupByCpf = async (
    cpfDigits: string
  ): Promise<{ found: boolean; peregrino: boolean; data?: Record<string, unknown> }> => {
    const response = await fetch(`/api/staff/registration?cpf=${encodeURIComponent(cpfDigits)}`);
    if (!response.ok) return { found: false, peregrino: false };
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
      found?: boolean;
      peregrino?: boolean;
    };
    return { found: !!data.found, peregrino: !!data.peregrino, data };
  };

  // Conveniência no cadastro: ao sair do CPF, abre a edição se já for staff, ou
  // bloqueia com mensagem se o CPF já estiver inscrito como peregrino.
  const handleCpfBlur = async () => {
    if (step !== "register") return;
    const digits = canonicalizeCpf(form.cpf);
    if (!isValidCpf(digits)) return;
    try {
      const res = await lookupByCpf(digits);
      if (res.found && res.data) {
        fillFromData(res.data);
        setStep("edit");
        setErrors({});
        setFormError(null);
        setSavedMessage(null);
      } else if (res.peregrino) {
        setFormError(t("errors.registered_as_peregrino"));
      }
    } catch {
      /* segue como nova inscrição */
    }
  };

  // Pré-check do "Quero me inscrever": valida o CPF antes de abrir o formulário
  // completo. Se já for staff, abre a edição; se já for peregrino, bloqueia.
  const handleRegisterPrecheck = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const digits = canonicalizeCpf(form.cpf);
    if (!isValidCpf(digits)) {
      setErrors({ cpf: t("validation.invalidCpf") });
      return;
    }
    setErrors({});
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await lookupByCpf(digits);
      if (res.found && res.data) {
        fillFromData(res.data);
        setStep("edit");
      } else if (res.peregrino) {
        setFormError(t("errors.registered_as_peregrino"));
      } else {
        setStep("register");
      }
    } catch {
      setFormError(t("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const digits = canonicalizeCpf(form.cpf);
    if (!isValidCpf(digits)) {
      setErrors({ cpf: t("validation.invalidCpf") });
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await lookupByCpf(digits);
      if (res.found && res.data) {
        fillFromData(res.data);
        setStep("edit");
        setErrors({});
      } else if (res.peregrino) {
        setFormError(t("errors.registered_as_peregrino"));
      } else {
        setFormError(t("check.notFound"));
      }
    } catch {
      setFormError(t("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    const req = t("validation.required");
    if (!form.name.trim()) e.name = req;
    if (step === "register") {
      if (!form.email.trim()) e.email = req;
      if (!isValidCpf(canonicalizeCpf(form.cpf))) e.cpf = t("validation.invalidCpf");
    }
    if (!form.dateOfBirth) e.dateOfBirth = req;
    if (!form.phone.trim()) e.phone = req;
    if (!form.emergencyContactName.trim()) e.emergencyContactName = req;
    if (canonicalizeCpf(form.emergencyContactPhone).length < 10) {
      e.emergencyContactPhone = t("validation.invalidPhone");
    }
    if (!form.sleepAtMonastery) e.sleepAtMonastery = t("validation.select");
    if (!form.allergyMedication) e.allergyMedication = t("validation.select");
    if (form.allergyMedication === "yes" && !form.allergyMedicationDetails.trim()) {
      e.allergyMedicationDetails = t("validation.describe");
    }
    if (!form.dietaryRestriction) e.dietaryRestriction = t("validation.select");
    if (form.dietaryRestriction === "yes" && !form.dietaryRestrictionDetails.trim()) {
      e.dietaryRestrictionDetails = t("validation.describe");
    }
    if (!form.termsAccepted) e.termsAccepted = t("validation.acceptTerms");
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
      const isEdit = step === "edit";
      const url = isEdit ? "/api/staff/registration" : "/api/staff/register";
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        registration_number?: string;
      };
      if (!response.ok) {
        setFormError(errorMessage(data.error));
        return;
      }
      if (isEdit) {
        setSavedMessage(t("edit.saved"));
      } else {
        setRegistrationNumber(data.registration_number ?? null);
        setStep("edit");
        setSavedMessage(t("register.success"));
      }
    } catch {
      setFormError(t("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCancelModal = () => {
    setIsCancelOpen(true);
  };

  const confirmCancel = async () => {
    setIsCanceling(true);
    try {
      const response = await fetch("/api/staff/registration", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: canonicalizeCpf(form.cpf) }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setFormError(errorMessage(data.error) || tc("cancellation.error"));
        setIsCancelOpen(false);
        return;
      }
      setIsCancelOpen(false);
      setTopMessage(tc("cancellation.success"));
      resetAll("intent");
    } catch {
      setFormError(tc("cancellation.error"));
      setIsCancelOpen(false);
    } finally {
      setIsCanceling(false);
    }
  };

  const isEdit = step === "edit";
  const isFormStep = step === "register" || step === "edit";

  const renderFields = () => (
    <>
      <FormField label={rf("nameLabel")} htmlFor="name" error={errors.name} required>
        <Input id="name" type="text" value={form.name} placeholder={rf("namePlaceholder")}
          onChange={e => update("name", e.target.value)} autoComplete="name" />
      </FormField>

      <FormField label={rf("cpfLabel")} htmlFor="cpf" error={errors.cpf} required>
        <Input id="cpf" type="text" value={form.cpf} placeholder={rf("cpfPlaceholder")}
          onChange={e => update("cpf", formatCpfBR(e.target.value))} onBlur={handleCpfBlur}
          inputMode="numeric" disabled={isEdit} />
      </FormField>

      <FormField label={rf("emailLabel")} htmlFor="email" error={errors.email} required>
        <Input id="email" type="email" value={form.email} placeholder={rf("emailPlaceholder")}
          onChange={e => update("email", e.target.value)} autoComplete="email" disabled={isEdit} />
      </FormField>

      <FormField label={rf("dateOfBirthLabel")} htmlFor="dateOfBirth" error={errors.dateOfBirth} required>
        <Input id="dateOfBirth" type="date" value={form.dateOfBirth}
          onChange={e => update("dateOfBirth", e.target.value)} />
      </FormField>

      <FormField label={rf("whatsappLabel")} htmlFor="phone" error={errors.phone} required>
        <Input id="phone" type="text" value={form.phone} placeholder={rf("whatsappPlaceholder")}
          onChange={e => update("phone", formatPhoneBR(e.target.value))} inputMode="tel" />
      </FormField>

      <FormField label={rf("emergencyContactNameLabel")} htmlFor="emergencyContactName"
        error={errors.emergencyContactName} required>
        <Input id="emergencyContactName" type="text" value={form.emergencyContactName}
          placeholder={rf("emergencyContactNamePlaceholder")}
          onChange={e => update("emergencyContactName", e.target.value)} autoComplete="name" />
      </FormField>

      <FormField label={rf("emergencyContactPhoneLabel")} htmlFor="emergencyContactPhone"
        error={errors.emergencyContactPhone} required>
        <Input id="emergencyContactPhone" type="text" value={form.emergencyContactPhone}
          placeholder={rf("emergencyContactPhonePlaceholder")}
          onChange={e => update("emergencyContactPhone", formatPhoneBR(e.target.value))} inputMode="tel" />
      </FormField>

      <FormField label={rf("cepLabel")} htmlFor="cep" error={errors.cep}>
        <Input id="cep" type="text" value={form.cep} placeholder={rf("cepPlaceholder")}
          onChange={e => handleCepChange(e.target.value)} inputMode="numeric"
          autoComplete="postal-code" />
      </FormField>

      <FormField label={rf("addressLabel")} htmlFor="address" error={errors.address}>
        <Input id="address" type="text" value={form.address} placeholder={rf("addressPlaceholder")}
          onChange={e => update("address", e.target.value)} autoComplete="street-address" />
      </FormField>

      <FieldRow>
        <FormField label={rf("numberLabel")} htmlFor="number" error={errors.number}>
          <Input id="number" type="text" value={form.number} placeholder={rf("numberPlaceholder")}
            onChange={e => update("number", e.target.value)} inputMode="numeric" />
        </FormField>
        <FormField label={rf("complementLabel")} htmlFor="complement">
          <Input id="complement" type="text" value={form.complement}
            placeholder={rf("complementPlaceholder")}
            onChange={e => update("complement", e.target.value)} />
        </FormField>
      </FieldRow>

      <FieldRow>
        <FormField label={rf("cityLabel")} htmlFor="city" error={errors.city}>
          <Input id="city" type="text" value={form.city} placeholder={rf("cityPlaceholder")}
            onChange={e => update("city", e.target.value)} autoComplete="address-level2" />
        </FormField>
        <FormField label={rf("stateLabel")} htmlFor="state" error={errors.state}>
          <Input id="state" type="text" maxLength={2} value={form.state}
            placeholder={rf("statePlaceholder")}
            onChange={e => update("state", e.target.value.toUpperCase())} autoComplete="address-level1" />
        </FormField>
      </FieldRow>

      <FormField label={rf("sleepQuestion")} htmlFor="sleepAtMonastery"
        error={errors.sleepAtMonastery} required>
        <Select id="sleepAtMonastery" value={form.sleepAtMonastery}
          onChange={e => update("sleepAtMonastery", e.target.value as YesNo)}>
          <option value="" disabled>{rf("sleepPlaceholder")}</option>
          <option value="yes">{rf("sleepYes")}</option>
          <option value="no">{rf("sleepNo")}</option>
        </Select>
      </FormField>

      {form.sleepAtMonastery === "yes" && (
        <FormField label={`${rf("companionBeforeGroup")} ${rf("companionGroup")}`} htmlFor="companionName">
          <Input id="companionName" type="text" value={form.companionName}
            placeholder={rf("companionPlaceholder")}
            onChange={e => update("companionName", e.target.value)} />
        </FormField>
      )}

      <FormField label={rf("allergyMedicationQuestion")} htmlFor="allergyMedicationYes"
        error={errors.allergyMedication} required>
        <RadioRow>
          <label>
            <input id="allergyMedicationYes" type="radio" name="allergyMedication"
              checked={form.allergyMedication === "yes"} onChange={() => update("allergyMedication", "yes")} />
            {rf("yes")}
          </label>
          <label>
            <input type="radio" name="allergyMedication" checked={form.allergyMedication === "no"}
              onChange={() => update("allergyMedication", "no")} />
            {rf("no")}
          </label>
        </RadioRow>
      </FormField>
      {form.allergyMedication === "yes" && (
        <FormField label={rf("allergyMedicationPlaceholder")} htmlFor="allergyMedicationDetails"
          error={errors.allergyMedicationDetails}>
          <Input id="allergyMedicationDetails" type="text" value={form.allergyMedicationDetails}
            placeholder={rf("allergyMedicationPlaceholder")}
            onChange={e => update("allergyMedicationDetails", e.target.value)} />
        </FormField>
      )}

      <FormField label={rf("dietaryRestrictionQuestion")} htmlFor="dietaryRestrictionYes"
        error={errors.dietaryRestriction} required>
        <RadioRow>
          <label>
            <input id="dietaryRestrictionYes" type="radio" name="dietaryRestriction"
              checked={form.dietaryRestriction === "yes"} onChange={() => update("dietaryRestriction", "yes")} />
            {rf("yes")}
          </label>
          <label>
            <input type="radio" name="dietaryRestriction" checked={form.dietaryRestriction === "no"}
              onChange={() => update("dietaryRestriction", "no")} />
            {rf("no")}
          </label>
        </RadioRow>
      </FormField>
      {form.dietaryRestriction === "yes" && (
        <FormField label={rf("dietaryRestrictionPlaceholder")} htmlFor="dietaryRestrictionDetails"
          error={errors.dietaryRestrictionDetails}>
          <Input id="dietaryRestrictionDetails" type="text" value={form.dietaryRestrictionDetails}
            placeholder={rf("dietaryRestrictionPlaceholder")}
            onChange={e => update("dietaryRestrictionDetails", e.target.value)} />
        </FormField>
      )}

      <div>
        <TermsLabel htmlFor="termsAccepted">
          <input id="termsAccepted" type="checkbox" checked={form.termsAccepted}
            onChange={e => update("termsAccepted", e.target.checked)} />
          <span>
            {rf("termsLabel")}{" "}
            <Link to="/responsabilityTerms">{rf("termsLinkText")}</Link>.
          </span>
        </TermsLabel>
        {errors.termsAccepted && <ErrorText>{errors.termsAccepted}</ErrorText>}
      </div>
    </>
  );

  return (
    <StaffPage>
      <StaffContainer>
        <StaffBanner>{t("banner")}</StaffBanner>

        <MotivationCard>
          <MotivationMessage>{t("thanks.message")}</MotivationMessage>
          <MotivationVerse>{t("thanks.verse")}</MotivationVerse>
          <MotivationVerseRef>{t("thanks.verseRef")}</MotivationVerseRef>
        </MotivationCard>

        <StaffCard>
          {topMessage && step === "intent" && <SuccessBanner>{topMessage}</SuccessBanner>}

          {step === "intent" && (
            <>
              <IntentTitle>{t("intent.title")}</IntentTitle>
              <IntentGrid>
                <IntentButton type="button" onClick={() => resetAll("registerCheck")}>
                  <strong>{t("intent.registerTitle")} →</strong>
                  <span>{t("intent.registerHint")}</span>
                </IntentButton>
                <IntentButton type="button" onClick={() => { setTopMessage(null); resetAll("check"); }}>
                  <strong>{t("intent.checkTitle")} →</strong>
                  <span>{t("intent.checkHint")}</span>
                </IntentButton>
              </IntentGrid>
            </>
          )}

          {step === "registerCheck" && (
            <>
              <BackButton type="button" onClick={() => resetAll("intent")}>← {t("back")}</BackButton>
              <StaffTitle>{t("register.title")}</StaffTitle>
              <StaffSubtitle>{tl("signup.registerCheck.subtitle")}</StaffSubtitle>
              <SignupForm noValidate onSubmit={handleRegisterPrecheck}>
                <FormField label={rf("nameLabel")} htmlFor="precheck-name" error={errors.name}>
                  <Input id="precheck-name" type="text" value={form.name}
                    placeholder={rf("namePlaceholder")}
                    onChange={e => update("name", e.target.value)} autoComplete="name" />
                </FormField>
                <FormField label={rf("cpfLabel")} htmlFor="precheck-cpf" error={errors.cpf} required>
                  <Input id="precheck-cpf" type="text" value={form.cpf}
                    placeholder={rf("cpfPlaceholder")}
                    onChange={e => update("cpf", formatCpfBR(e.target.value))} inputMode="numeric" />
                </FormField>
                {formError && <ErrorText>{formError}</ErrorText>}
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("check.loading") : tl("signup.registerCheck.submit")}
                </PrimaryButton>
              </SignupForm>
            </>
          )}

          {step === "check" && (
            <>
              <BackButton type="button" onClick={() => resetAll("intent")}>← {t("back")}</BackButton>
              <StaffTitle>{t("check.title")}</StaffTitle>
              <StaffSubtitle>{t("check.subtitle")}</StaffSubtitle>
              <SignupForm noValidate onSubmit={handleCheckSubmit}>
                <FormField label={rf("cpfLabel")} htmlFor="check-cpf" error={errors.cpf} required>
                  <Input id="check-cpf" type="text" value={form.cpf} placeholder={rf("cpfPlaceholder")}
                    onChange={e => update("cpf", formatCpfBR(e.target.value))} inputMode="numeric" />
                </FormField>
                {formError && <ErrorText>{formError}</ErrorText>}
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("check.loading") : t("check.submit")}
                </PrimaryButton>
              </SignupForm>
            </>
          )}

          {isFormStep && (
            <>
              <BackButton type="button" onClick={() => resetAll("intent")}>← {t("back")}</BackButton>
              {isEdit ? (
                <>
                  <SuccessBanner>
                    {t("edit.successTitle")}
                    {registrationNumber ? ` — Nº ${registrationNumber}` : ""}!
                  </SuccessBanner>
                  <StaffSubtitle>{t("edit.subtitle")}</StaffSubtitle>
                </>
              ) : (
                <>
                  <StaffTitle>{t("register.title")}</StaffTitle>
                  <StaffSubtitle>{t("register.subtitle")}</StaffSubtitle>
                </>
              )}

              <SignupForm noValidate onSubmit={handleSubmit}>
                {renderFields()}

                {formError && <ErrorText>{formError}</ErrorText>}
                {savedMessage && <SuccessText>{savedMessage}</SuccessText>}

                <PrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? isEdit ? t("edit.saving") : t("register.loading")
                    : isEdit ? t("edit.save") : t("register.submit")}
                </PrimaryButton>

                {isEdit && (
                  <DangerButton type="button" disabled={isSubmitting} onClick={openCancelModal}>
                    {t("edit.cancel")}
                  </DangerButton>
                )}
              </SignupForm>
            </>
          )}
        </StaffCard>
      </StaffContainer>

      {isCancelOpen && (
        <ModalOverlay onClick={() => setIsCancelOpen(false)}>
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <ModalTitle id="cancel-modal-title">{tc("cancellation.title")}</ModalTitle>
            <ModalText>{tc("cancellation.confirmQuestion")}</ModalText>

            <ModalActions>
              <SecondaryButton type="button" onClick={() => setIsCancelOpen(false)} disabled={isCanceling}>
                {tc("cancellation.exit")}
              </SecondaryButton>
              <DangerButton type="button" onClick={confirmCancel} disabled={isCanceling}>
                {tc("cancellation.confirm")}
              </DangerButton>
            </ModalActions>
          </ModalDialog>
        </ModalOverlay>
      )}
    </StaffPage>
  );
};

export default StaffPageComponent;
