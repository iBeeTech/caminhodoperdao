import React, { ChangeEvent, FormEvent, RefObject, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AvailabilityState, LandingPhase, LandingTone } from "../../../Model";
import { Callout, FormField, Input, Select } from "../../../../../components";
import { ErrorText } from "../../../../../components/molecules/FormField/FormField.styles";
import TrackedButton from "../../../../../components/analytics/TrackedButton";
import EnrollmentCallout from "../../../../../components/molecules/EnrollmentCallout/EnrollmentCallout";
import { useFeatureFlags } from "../../../../../hooks/useFeatureFlags";
import { LANDING_CTAS } from "../../../../../utils/analytics/catalog/ctas";
import { LANDING_SECTIONS } from "../../../../../utils/analytics/catalog/sections";
import checkAmarelo from "../../../../../assets/check-amarelo.png";
import check from "../../../../../assets/check.png";
import whatsappIcon from "../../../../../assets/whatsapp.png";
import starIcon from "../../../../../assets/star.png";
import { formatCpfBR } from "../../../../../utils/formatters/cpf";
import { Link } from "react-router-dom";
import {
  Container,
  MonasteryNote,
  PaidBox,
  PixActions,
  PixBox,
  PixLabel,
  PixLabelContainer,
  CopyButton,
  PixTextarea,
  QRCodeContainer,
  QRCodeImage,
  SignupBullets,
  SignupCard,
  SignupHeader,
  SignupSectionWrapper,
  SignupForm,
  SignupWarningIcon,
  StatusMessage,
  WarningNote,
} from "./SignupSection.styles";

interface SignupRefs {
  nameRef: RefObject<HTMLInputElement | null>;
  emailRef: RefObject<HTMLInputElement | null>;
  cpfRef: RefObject<HTMLInputElement | null>;
  dateOfBirthRef: RefObject<HTMLInputElement | null>;
  phoneRef: RefObject<HTMLInputElement | null>;
  cepRef: RefObject<HTMLInputElement | null>;
  addressRef: RefObject<HTMLInputElement | null>;
  numberRef: RefObject<HTMLInputElement | null>;
  complementRef: RefObject<HTMLInputElement | null>;
  cityRef: RefObject<HTMLInputElement | null>;
  stateRef: RefObject<HTMLInputElement | null>;
  sleepAtMonasteryRef: RefObject<HTMLSelectElement | null>;
  termsAcceptedRef: RefObject<HTMLInputElement | null>;
  companionRef: RefObject<HTMLInputElement | null>;
  allergyMedicationYesRef: RefObject<HTMLInputElement | null>;
  allergyMedicationNoRef: RefObject<HTMLInputElement | null>;
  allergyMedicationDetailsRef: RefObject<HTMLInputElement | null>;
  dietaryRestrictionYesRef: RefObject<HTMLInputElement | null>;
  dietaryRestrictionNoRef: RefObject<HTMLInputElement | null>;
  dietaryRestrictionDetailsRef: RefObject<HTMLInputElement | null>;
  emergencyContactNameRef: RefObject<HTMLInputElement | null>;
  emergencyContactPhoneRef: RefObject<HTMLInputElement | null>;
}

type SignupErrors = Partial<{
  name: string;
  email: string;
  cpf: string;
  dateOfBirth: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  city: string;
  state: string;
  sleepAtMonastery: string;
  termsAccepted: string;
  emailUsedByOtherName: string;
  allergyMedication: string;
  allergyMedicationDetails: string;
  dietaryRestriction: string;
  dietaryRestrictionDetails: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}>;

interface SignupSectionProps {
  availability: AvailabilityState;
  phase: LandingPhase;
  errors: SignupErrors;
  statusMessage: string | null;
  statusTone: LandingTone;
  currentStatus: string | null;
  qrCodeText: string | null;
  qrCodeImageUrl: string | null;
  capacityCallout: string | null;
  isCheckingStatus: boolean;
  isSubmittingRegistration: boolean;
  isSleepLocked: boolean;
  refs: SignupRefs;
  onCheckStatus: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitRegistration: (event: FormEvent<HTMLFormElement>) => void;
  onPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCepChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /**
   * IMPORTANT:
   * Esse handler precisa validar o e-mail atual (lido via emailRef.current?.value no controller/pai)
   * e setar/limpar errors.emailUsedByOtherName de forma IMUTÁVEL.
   */
  onEmailBlur: () => void;
  onReopenRegistration: () => void;
  onNewRegistration: () => void;
  getNextWhatsappUrl: () => Promise<string>;
  /** Limpa o erro de CPF ao editar o campo (check e registro) */
  onCpfChange?: () => void;
  /** Limpa o erro de telefone principal ao editar */
  onPhoneChangeError?: () => void;
  /** Limpa o erro de termos ao marcar o checkbox */
  onTermsChange?: () => void;
  /** Limpa o erro de nome do contato de emergência ao editar */
  onEmergencyContactNameChange?: () => void;
  /** Limpa o erro de telefone do contato de emergência ao editar */
  onEmergencyContactPhoneChange?: () => void;
}

const SignupSection: React.FC<SignupSectionProps> = ({
  availability,
  phase,
  errors,
  statusMessage,
  statusTone,
  currentStatus,
  qrCodeText,
  qrCodeImageUrl,
  capacityCallout,
  isCheckingStatus,
  isSubmittingRegistration,
  isSleepLocked,
  refs,
  onCheckStatus,
  onSubmitRegistration,
  onPhoneChange,
  onCepChange,
  onEmailBlur,
  onReopenRegistration,
  onNewRegistration,
  getNextWhatsappUrl,
  onCpfChange,
  onPhoneChangeError,
  onTermsChange,
  onEmergencyContactNameChange,
  onEmergencyContactPhoneChange,
}) => {
  const [sleepSelected, setSleepSelected] = useState<string>("");
  const [hasAllergyMedication, setHasAllergyMedication] = useState<string>("");
  const [hasDietaryRestriction, setHasDietaryRestriction] = useState<string>("");
  const [copiedBrcode, setCopiedBrcode] = useState(false);
  const { t } = useTranslation("landing");
  const { isEnabled: enrollmentEnabled } = useFeatureFlags("enrollment");

  const statusRole = statusTone === "error" ? "alert" : "status";
  const statusLive = statusTone === "error" ? "assertive" : "polite";
  const pixTextareaId = "pix-code";

  const hasAvailabilityError = Boolean(availability.error);
  const showCheckForm = !hasAvailabilityError && phase === "check" && !availability.totalFull && enrollmentEnabled;
  const showRegistrationForm = !hasAvailabilityError && phase === "form" && !availability.totalFull && enrollmentEnabled;
  const showStatus = !hasAvailabilityError && phase === "status" && enrollmentEnabled;

  // Debounce para validar email enquanto digita (sem libs novas)
  const emailDebounceRef = useRef<number | null>(null);

  const handleCopyBrcode = async () => {
    if (!qrCodeText) return;

    try {
      await navigator.clipboard.writeText(qrCodeText);
      setCopiedBrcode(true);
      setTimeout(() => setCopiedBrcode(false), 2000);
    } catch (err) {
      console.error(t("signup.status.copyPixErrorLog"), err);
    }
  };

  const {
    nameRef,
    emailRef,
    cpfRef,
    dateOfBirthRef,
    phoneRef,
    cepRef,
    addressRef,
    numberRef,
    complementRef,
    cityRef,
    stateRef,
    sleepAtMonasteryRef,
    termsAcceptedRef,
    companionRef,
    allergyMedicationYesRef,
    allergyMedicationNoRef,
    allergyMedicationDetailsRef,
    dietaryRestrictionYesRef,
    dietaryRestrictionNoRef,
    dietaryRestrictionDetailsRef,
    emergencyContactNameRef,
    emergencyContactPhoneRef,
  } = refs;

  React.useEffect(() => {
    if (!showRegistrationForm) return;

    if (allergyMedicationYesRef.current?.checked) {
      setHasAllergyMedication("yes");
    } else if (allergyMedicationNoRef.current?.checked) {
      setHasAllergyMedication("no");
    }

    if (dietaryRestrictionYesRef.current?.checked) {
      setHasDietaryRestriction("yes");
    } else if (dietaryRestrictionNoRef.current?.checked) {
      setHasDietaryRestriction("no");
    }
  }, [
    showRegistrationForm,
    allergyMedicationYesRef,
    allergyMedicationNoRef,
    dietaryRestrictionYesRef,
    dietaryRestrictionNoRef,
  ]);

  const validateEmailNow = () => {
    // Dispara validação no controller/pai (ele decide setar/limpar errors.emailUsedByOtherName)
    onEmailBlur();
  };

  const handleEmailChangeDebounced = () => {
    if (emailDebounceRef.current) {
      window.clearTimeout(emailDebounceRef.current);
    }
    emailDebounceRef.current = window.setTimeout(() => {
      validateEmailNow();
    }, 450);
  };

  const handleCpfChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.target.value = formatCpfBR(event.target.value);
  };

  const handleCheckSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Garante validação antes do submit (cobre caso sem blur)
    validateEmailNow();

    // Se já existe erro (por estado anterior), bloqueia.
    // Obs: se a validação seta erro async no pai, o bloqueio pode acontecer no próximo submit.
    if (errors.emailUsedByOtherName) {
      event.preventDefault();
      return;
    }

    onCheckStatus(event);
  };

  const handleRegistrationSubmit = (event: FormEvent<HTMLFormElement>) => {
    validateEmailNow();

    if (errors.emailUsedByOtherName) {
      event.preventDefault();
      return;
    }

    onSubmitRegistration(event);
  };

  return (
    <SignupSectionWrapper id="registration-form">
      <Container>
        <SignupCard>
          <SignupHeader>
            <h2>{t("signup.title")}</h2>
            <Callout variant="warning" style={{ margin: "0 0 24px 0", textAlign: "center", fontSize: "1.1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
                <SignupWarningIcon>
                  {/* Emoji de warning, pode substituir por SVG se preferir */}
                  <span role="img" aria-label={t("signup.warning.ariaLabel")} style={{ fontSize: "1.5rem" }}>
                    ⚠️
                  </span>
                </SignupWarningIcon>
                <span style={{ fontWeight: 700, fontSize: "1.3rem", color: "#b45309" }}>{t("signup.warning.title")}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={{ color: "#b45309", fontWeight: 600, fontSize: "1.1rem", marginBottom: 8 }}>
                  {t("signup.disclaimer")}
                </li>
                <li style={{ color: "#b45309", fontWeight: 600, fontSize: "1.1rem" }}>
                  {t("signup.warning.departureTime")}
                </li>
              </ul>
            </Callout>
            <SignupBullets>
              {(t("signup.bullets", { returnObjects: true }) as string[]).map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </SignupBullets>
          </SignupHeader>

          <EnrollmentCallout />
            {capacityCallout && <Callout variant="warning">{capacityCallout}</Callout>}
            {hasAvailabilityError && <Callout variant="error">{t("signup.callouts.availabilityError")}</Callout>}
            {availability.totalFull && phase !== "status" && !capacityCallout && (
              <Callout variant="warning">{t("signup.callouts.full")}</Callout>
            )}

          {/* Callout para email já utilizado por outro nome */}
          {errors.emailUsedByOtherName && (
            <Callout variant="warning" style={{ marginBottom: 24, textAlign: "center", fontSize: "1.1rem" }}>
              {errors.emailUsedByOtherName}
            </Callout>
          )}

          {/* Callout principal para inscrição reservada: mostrar apenas no status pendente, não no formulário inicial */}
          {showStatus && currentStatus === "PENDING" && (
            <div
              style={{
                marginBottom: 24,
                background: "#fffcf2",
                border: "1.5px solid #facc15",
                color: "#a15c00",
                textAlign: "center",
                boxShadow: "0 2px 8px 0 rgba(250,204,21,0.07)",
                borderRadius: 20,
                padding: "2rem 1.5rem",
                fontSize: "1.25rem",
                fontWeight: 500,
                lineHeight: 1.5,
                maxWidth: "100%",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  fontSize: "1.5rem",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "center",
                  color: "#a15c00",
                }}
              >
                <img src={checkAmarelo} alt={t("signup.status.pendingIconAlt")} style={{ width: 32, height: 32 }} />
                {t("signup.status.pendingReservedTitle")}
              </div>
              <div
                style={{
                  marginBottom: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  color: "#a15c00",
                  fontWeight: 600,
                  fontSize: "1.18rem",
                }}
              >
                <div>{t("signup.status.pendingPaymentWindow")}</div>
                <div>
                  {t("signup.status.pendingProcessing")}
                </div>
                <div>
                  {t("signup.status.pendingReloadOnly")}
                </div>
              </div>
            </div>
          )}

          {showCheckForm && (
            <SignupForm noValidate onSubmit={handleCheckSubmit}>
              <FormField label={t("signup.checkForm.nameLabel")} htmlFor="name" error={errors.name}>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t("signup.checkForm.namePlaceholder")}
                  ref={nameRef as RefObject<HTMLInputElement>}
                  autoComplete="name"
                />
              </FormField>

              <FormField label={t("signup.checkForm.cpfLabel")} htmlFor="cpf" error={errors.cpf} required>
                <Input
                  id="cpf"
                  name="cpf"
                  type="text"
                  placeholder={t("signup.checkForm.cpfPlaceholder")}
                  ref={cpfRef as RefObject<HTMLInputElement>}
                  onChange={(e) => {
                    handleCpfChange(e);
                    onCpfChange?.();
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </FormField>

              <TrackedButton
                pageName="landing"
                ctaId={LANDING_CTAS.FORM_CHECK_STATUS}
                sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                variant="primary"
                size="md"
                type="submit"
                disabled={isCheckingStatus || availability.loading || Boolean(errors.emailUsedByOtherName)}
                loading={isCheckingStatus}
              >
                {isCheckingStatus ? t("signup.checkForm.loading") : t("signup.checkForm.submit")}
              </TrackedButton>
            </SignupForm>
          )}

          {showRegistrationForm && (
            <SignupForm noValidate onSubmit={handleRegistrationSubmit}>
              <FormField label={t("signup.registrationForm.nameLabel")} htmlFor="name-full" error={errors.name} required>
                <Input
                  id="name-full"
                  name="name-full"
                  type="text"
                  placeholder={t("signup.registrationForm.namePlaceholder")}
                  ref={nameRef as RefObject<HTMLInputElement>}
                  autoComplete="name"
                />
              </FormField>

              <FormField label={t("signup.registrationForm.cpfLabel")} htmlFor="cpf-full" error={errors.cpf} required>
                <Input
                  id="cpf-full"
                  name="cpf-full"
                  type="text"
                  placeholder={t("signup.registrationForm.cpfPlaceholder")}
                  ref={cpfRef as RefObject<HTMLInputElement>}
                  onChange={(e) => {
                    handleCpfChange(e);
                    onCpfChange?.();
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </FormField>

              <FormField
                label={t("signup.registrationForm.emailLabel")}
                htmlFor="email-full"
                error={errors.email}
                required
              >
                <Input
                  id="email-full"
                  name="email-full"
                  type="email"
                  placeholder={t("signup.registrationForm.emailPlaceholder")}
                  ref={emailRef as RefObject<HTMLInputElement>}
                  onBlur={validateEmailNow}
                  onChange={handleEmailChangeDebounced} // ✅ valida enquanto digita (debounced)
                  autoComplete="email"
                />
              </FormField>

              <FormField
                label={t("signup.registrationForm.dateOfBirthLabel")}
                htmlFor="dateOfBirth"
                error={errors.dateOfBirth}
                required
              >
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  ref={dateOfBirthRef as RefObject<HTMLInputElement>}
                  autoComplete="bday"
                />
              </FormField>

              <FormField label={t("signup.registrationForm.whatsappLabel")} htmlFor="phone" error={errors.phone} required>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  placeholder={t("signup.registrationForm.whatsappPlaceholder")}
                  ref={phoneRef as RefObject<HTMLInputElement>}
                  onChange={(e) => {
                    onPhoneChange(e);
                    onPhoneChangeError?.();
                  }}
                  inputMode="tel"
                  autoComplete="tel"
                />
              </FormField>

              <FormField
                label={t("signup.registrationForm.emergencyContactNameLabel")}
                htmlFor="emergencyContactName"
                error={errors.emergencyContactName}
                required
              >
                <Input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  type="text"
                  placeholder={t("signup.registrationForm.emergencyContactNamePlaceholder")}
                  ref={emergencyContactNameRef as RefObject<HTMLInputElement>}
                  onChange={() => onEmergencyContactNameChange?.()}
                  autoComplete="name"
                />
              </FormField>

              <FormField
                label={t("signup.registrationForm.emergencyContactPhoneLabel")}
                htmlFor="emergencyContactPhone"
                error={errors.emergencyContactPhone}
                required
              >
                <Input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="text"
                  placeholder={t("signup.registrationForm.emergencyContactPhonePlaceholder")}
                  ref={emergencyContactPhoneRef as RefObject<HTMLInputElement>}
                  onChange={(e) => {
                    onPhoneChange(e);
                    onEmergencyContactPhoneChange?.();
                  }}
                  inputMode="tel"
                  autoComplete="tel"
                />
              </FormField>

              <FormField label={t("signup.registrationForm.cepLabel")} htmlFor="cep" error={errors.cep} required>
                <Input
                  id="cep"
                  name="cep"
                  type="text"
                  placeholder={t("signup.registrationForm.cepPlaceholder")}
                  ref={cepRef as RefObject<HTMLInputElement>}
                  onChange={onCepChange}
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </FormField>

              <FormField label={t("signup.registrationForm.addressLabel")} htmlFor="address" error={errors.address} required>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  placeholder={t("signup.registrationForm.addressPlaceholder")}
                  ref={addressRef as RefObject<HTMLInputElement>}
                  autoComplete="street-address"
                />
              </FormField>

              <FormField label={t("signup.registrationForm.numberLabel")} htmlFor="number" error={errors.number} required>
                <Input
                  id="number"
                  name="number"
                  type="text"
                  placeholder={t("signup.registrationForm.numberPlaceholder")}
                  ref={numberRef as RefObject<HTMLInputElement>}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </FormField>

              <FormField label={t("signup.registrationForm.complementLabel")} htmlFor="complement">
                <Input
                  id="complement"
                  name="complement"
                  type="text"
                  placeholder={t("signup.registrationForm.complementPlaceholder")}
                  ref={complementRef as RefObject<HTMLInputElement>}
                  autoComplete="address-line2"
                />
              </FormField>

              <FormField label={t("signup.registrationForm.cityLabel")} htmlFor="city" error={errors.city} required>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  placeholder={t("signup.registrationForm.cityPlaceholder")}
                  ref={cityRef as RefObject<HTMLInputElement>}
                  autoComplete="address-level2"
                />
              </FormField>

              <FormField label={t("signup.registrationForm.stateLabel")} htmlFor="state" error={errors.state} required>
                <Input
                  id="state"
                  name="state"
                  type="text"
                  maxLength={2}
                  placeholder={t("signup.registrationForm.statePlaceholder")}
                  ref={stateRef as RefObject<HTMLInputElement>}
                  autoComplete="address-level1"
                />
              </FormField>

              <FormField
                label={t("signup.registrationForm.sleepQuestion")}
                htmlFor="sleepAtMonastery"
                error={errors.sleepAtMonastery}
                required
              >
                {isSleepLocked ? (
                  <MonasteryNote>{t("signup.registrationForm.sleepLocked")}</MonasteryNote>
                ) : (
                  <Select
                    id="sleepAtMonastery"
                    name="sleepAtMonastery"
                    ref={sleepAtMonasteryRef as RefObject<HTMLSelectElement>}
                    defaultValue=""
                    onChange={(e) => setSleepSelected(e.target.value)}
                  >
                    <option value="" disabled>
                      {t("signup.registrationForm.sleepPlaceholder")}
                    </option>
                    <option value="yes" disabled={availability.monasteryFull}>
                      {availability.monasteryFull
                        ? t("signup.registrationForm.sleepYesFull")
                        : t("signup.registrationForm.sleepYes")}
                    </option>
                    <option value="no">{t("signup.registrationForm.sleepNo")}</option>
                  </Select>
                )}
              </FormField>

              {showRegistrationForm && sleepSelected === "yes" && (
                <FormField
                  label={
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <img src={starIcon} alt="" style={{ width: "1rem", height: "1rem" }} />
                      <span style={{ display: "inline" }}>{t("signup.registrationForm.companionPrefix")}</span>
                      {t("signup.registrationForm.companionBeforeGroup")} <strong>{t("signup.registrationForm.companionGroup")}</strong>{" "}
                      {t("signup.registrationForm.companionOr")} <strong>{t("signup.registrationForm.companionSurname")}</strong>{" "}
                      {t("signup.registrationForm.companionFamilySuffix")} <strong>{t("signup.registrationForm.companionFullName")}</strong>{" "}
                      {t("signup.registrationForm.companionFinalSuffix")}
                    </span>
                  }
                  htmlFor="companion"
                >
                  <Input
                    id="companion"
                    name="companion"
                    type="text"
                    placeholder={t("signup.registrationForm.companionPlaceholder")}
                    ref={companionRef as RefObject<HTMLInputElement>}
                    autoComplete="off"
                  />
                </FormField>
              )}

              <FormField
                label={t("signup.registrationForm.allergyMedicationQuestion")}
                htmlFor="allergyMedicationYes"
                error={errors.allergyMedication}
                required
              >
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: hasAllergyMedication === "yes" ? "0.75rem" : 0 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                    <input
                      ref={allergyMedicationYesRef as RefObject<HTMLInputElement>}
                      id="allergyMedicationYes"
                      type="radio"
                      name="allergyMedication"
                      value="yes"
                      onChange={() => setHasAllergyMedication("yes")}
                    />
                    {t("signup.registrationForm.yes")}
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                    <input
                      ref={allergyMedicationNoRef as RefObject<HTMLInputElement>}
                      id="allergyMedicationNo"
                      type="radio"
                      name="allergyMedication"
                      value="no"
                      onChange={() => {
                        setHasAllergyMedication("no");
                        if (allergyMedicationDetailsRef.current) {
                          allergyMedicationDetailsRef.current.value = "";
                        }
                      }}
                    />
                    {t("signup.registrationForm.no")}
                  </label>
                </div>
                {hasAllergyMedication === "yes" && (
                  <Input
                    id="allergyMedicationDetails"
                    name="allergyMedicationDetails"
                    type="text"
                    placeholder={t("signup.registrationForm.allergyMedicationPlaceholder")}
                    ref={allergyMedicationDetailsRef as RefObject<HTMLInputElement>}
                    required
                    autoComplete="off"
                  />
                )}
                {errors.allergyMedicationDetails && (
                  <ErrorText role="alert" aria-live="assertive">
                    {errors.allergyMedicationDetails}
                  </ErrorText>
                )}
              </FormField>

              <FormField
                label={t("signup.registrationForm.dietaryRestrictionQuestion")}
                htmlFor="dietaryRestrictionYes"
                error={errors.dietaryRestriction}
                required
              >
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: hasDietaryRestriction === "yes" ? "0.75rem" : 0 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                    <input
                      ref={dietaryRestrictionYesRef as RefObject<HTMLInputElement>}
                      id="dietaryRestrictionYes"
                      type="radio"
                      name="dietaryRestriction"
                      value="yes"
                      onChange={() => setHasDietaryRestriction("yes")}
                    />
                    {t("signup.registrationForm.yes")}
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                    <input
                      ref={dietaryRestrictionNoRef as RefObject<HTMLInputElement>}
                      id="dietaryRestrictionNo"
                      type="radio"
                      name="dietaryRestriction"
                      value="no"
                      onChange={() => {
                        setHasDietaryRestriction("no");
                        if (dietaryRestrictionDetailsRef.current) {
                          dietaryRestrictionDetailsRef.current.value = "";
                        }
                      }}
                    />
                    {t("signup.registrationForm.no")}
                  </label>
                </div>
                {hasDietaryRestriction === "yes" && (
                  <Input
                    id="dietaryRestrictionDetails"
                    name="dietaryRestrictionDetails"
                    type="text"
                    placeholder={t("signup.registrationForm.dietaryRestrictionPlaceholder")}
                    ref={dietaryRestrictionDetailsRef as RefObject<HTMLInputElement>}
                    required
                    autoComplete="off"
                  />
                )}
                {errors.dietaryRestrictionDetails && (
                  <ErrorText role="alert" aria-live="assertive">
                    {errors.dietaryRestrictionDetails}
                  </ErrorText>
                )}
              </FormField>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label
                  htmlFor="termsAccepted"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    flexWrap: "wrap",
                    fontWeight: 600,
                    color: "var(--color-text, #333)",
                  }}
                >
                  <span style={{ color: "var(--color-error, #b91c1c)", flexShrink: 0 }} aria-hidden="true">*</span>
                  <input
                    ref={termsAcceptedRef as RefObject<HTMLInputElement>}
                    id="termsAccepted"
                    name="termsAccepted"
                    type="checkbox"
                    style={{ marginTop: "0", flexShrink: 0 }}
                    onChange={() => onTermsChange?.()}
                  />
                  <span>
                    {t("signup.registrationForm.termsLabel")}{" "}
                    <Link to="/responsabilityTerms" style={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }}>
                      {t("signup.registrationForm.termsLinkText")}
                    </Link>
                    .
                  </span>
                </label>
                {errors.termsAccepted && (
                  <ErrorText role="alert" aria-live="assertive">
                    {errors.termsAccepted}
                  </ErrorText>
                )}
              </div>

              <TrackedButton
                pageName="landing"
                ctaId={LANDING_CTAS.FORM_SUBMIT}
                sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                variant="primary"
                size="md"
                type="submit"
                disabled={isSubmittingRegistration || Boolean(errors.emailUsedByOtherName) || Boolean(errors.termsAccepted) || Boolean(errors.emergencyContactName) || Boolean(errors.emergencyContactPhone)}
                loading={isSubmittingRegistration}
              >
                {isSubmittingRegistration ? t("signup.registrationForm.loading") : t("signup.registrationForm.submit")}
              </TrackedButton>
            </SignupForm>
          )}

          {showStatus && (
            <>
              {/* Não mostrar o callout duplicado nem o StatusMessage para pendente */}
              {statusMessage && currentStatus !== "PAID" && currentStatus !== "CANCELED" && currentStatus !== "PENDING" && (
                <StatusMessage
                  $tone={statusTone}
                  role={statusRole}
                  aria-live={statusLive}
                  tabIndex={-1}
                  style={{ fontSize: "1.05rem", textAlign: "center" }}
                >
                  {statusMessage}
                </StatusMessage>
              )}

              {statusMessage && !statusTone && currentStatus !== "PAID" && currentStatus !== "CANCELED" && currentStatus !== "PENDING" && (
                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                  <button
                    onClick={onNewRegistration}
                    style={{
                      cursor: "pointer",
                      color: "#2563eb",
                      textDecoration: "underline",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      transition: "color 0.2s",
                      background: "none",
                      border: "none",
                      padding: "0",
                      font: "inherit",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#1d4ed8")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#2563eb")}
                  >
                    {t("signup.status.newRegistration")}
                  </button>
                </div>
              )}

              {currentStatus === "PENDING" && (
                <PixBox>
                  {(() => {
                    const name =
                      typeof window !== "undefined" ? sessionStorage.getItem("landing_registration_name") : null;
                    const email =
                      typeof window !== "undefined" ? sessionStorage.getItem("landing_registration_email") : null;

                    if (name || email) {
                      return (
                        <div
                          style={{
                            fontSize: "0.95rem",
                            color: "#555",
                            marginBottom: "1.5rem",
                            textAlign: "center",
                            padding: "1rem",
                            backgroundColor: "#fef3c7",
                            borderRadius: "8px",
                            borderLeft: "4px solid #f59e0b",
                          }}
                        >
                          {name && (
                            <div style={{ marginBottom: "0.5rem" }}>
                              <strong>{t("signup.status.nameLabel")}:</strong> {name}
                            </div>
                          )}
                          {email && (
                            <div>
                              <strong>{t("signup.status.emailLabel")}:</strong> {email}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <PixLabelContainer>
                    <PixLabel htmlFor={pixTextareaId}>{t("signup.status.pixCopyLabel")}</PixLabel>
                    <CopyButton
                      onClick={handleCopyBrcode}
                      title={t("signup.status.copyPixAriaLabel")}
                      aria-label={t("signup.status.copyPixAriaLabel")}
                    >
                      <span>{copiedBrcode ? "✓" : "📋"}</span>
                      <span>{copiedBrcode ? t("signup.status.copyCopied") : t("signup.status.copyAction")}</span>
                    </CopyButton>
                  </PixLabelContainer>

                  <PixTextarea
                    id={pixTextareaId}
                    readOnly
                    value={qrCodeText ?? (t("signup.status.pixPendingPlaceholder") as string)}
                  />

                  {qrCodeImageUrl && (
                    <QRCodeContainer>
                      <QRCodeImage src={qrCodeImageUrl} alt={t("signup.status.qrCodeAlt")} />
                    </QRCodeContainer>
                  )}

                  <PixActions style={{ marginTop: "1.5rem", justifyContent: "center" }}>
                    <button
                      onClick={onNewRegistration}
                      style={{
                        cursor: "pointer",
                        color: "#2563eb",
                        textDecoration: "underline",
                        fontSize: "0.95rem",
                        fontWeight: "500",
                        transition: "color 0.2s",
                        background: "none",
                        border: "none",
                        padding: "0",
                        font: "inherit",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#1d4ed8")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#2563eb")}
                    >
                      {t("signup.status.newRegistration")}
                    </button>
                  </PixActions>
                </PixBox>
              )}

              {currentStatus === "CANCELED" && (
                <PixBox
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1rem",
                    padding: "1.5rem",
                    backgroundColor: "#fef2f2",
                    borderColor: "#fecdd3",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.5rem", fontWeight: "bold", textTransform: "uppercase", color: "#991b1b" }}>
                      {t("signup.status.canceledTitle")}
                    </span>
                  </div>

                  <span style={{ fontSize: "1.18rem", color: "#991b1b", textAlign: "center", fontWeight: 500 }}>
                    {t("signup.status.canceledDescription")}
                  </span>

                  <PixActions>
                    <TrackedButton
                      pageName="landing"
                      ctaId={LANDING_CTAS.REOPEN_REGISTRATION}
                      sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                      sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                      position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                      variant="primary"
                      size="sm"
                      onClick={onReopenRegistration}
                    >
                      {t("signup.status.reopen")}
                    </TrackedButton>
                  </PixActions>
                </PixBox>
              )}

              {currentStatus === "PAID" && (
                <>
                  {(() => {
                    const name =
                      typeof window !== "undefined" ? sessionStorage.getItem("landing_registration_name") : null;
                    const email =
                      typeof window !== "undefined" ? sessionStorage.getItem("landing_registration_email") : null;

                    if (name || email) {
                      return (
                        <div
                          style={{
                            fontSize: "0.95rem",
                            color: "#555",
                            marginBottom: "1.5rem",
                            textAlign: "center",
                            padding: "1rem",
                            backgroundColor: "#f0f7ff",
                            borderRadius: "8px",
                            borderLeft: "4px solid #2563eb",
                            width: "100%",
                          }}
                        >
                          {name && (
                            <div style={{ marginBottom: "0.5rem" }}>
                              <strong>{t("signup.status.nameLabel")}:</strong> {name}
                            </div>
                          )}
                          {email && (
                            <div>
                              <strong>{t("signup.status.emailLabel")}:</strong> {email}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <PaidBox
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "1rem",
                      padding: "1.5rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <img
                        src={check}
                        alt={t("signup.status.confirmedIconAlt")}
                        style={{
                          width: "1.5rem",
                          height: "1.5rem",
                          animation: "scaleAndSpin 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                      />
                      <span style={{ fontSize: "1.1rem", fontWeight: "bold", textTransform: "uppercase" }}>
                        {t("signup.status.confirmedTitle")}
                      </span>
                    </div>

                    <span style={{ fontSize: "1rem" }}>{t("signup.status.paidBox")}</span>
                    <span style={{ fontSize: "0.9rem", fontStyle: "italic", textAlign: "center" }}>{t("signup.status.paidReceipt")}</span>
                  </PaidBox>

                  <style>{`
                    @keyframes scaleAndSpin {
                      0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                      50% { transform: scale(1.1); }
                      100% { transform: scale(1) rotate(0deg); opacity: 1; }
                    }
                  `}</style>

                  <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                    <style>{`
                      @keyframes floating {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-8px); }
                      }
                      .whatsapp-button { animation: floating 3s ease-in-out infinite; }
                    `}</style>

                    <TrackedButton
                      pageName="landing"
                      ctaId={LANDING_CTAS.FORM_SUBMIT}
                      sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                      sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                      position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                      variant="primary"
                      size="md"
                      onClick={() => {
                        if (window && (window as any).analytics) {
                          (window as any).analytics.track && (window as any).analytics.track("whatsapp_signup_button_click");
                        }
                        window.open("https://chat.whatsapp.com/FBuIFntCDpxGceChM6zNNa", "_blank");
                      }}
                      className="whatsapp-button"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                    >
                      <img src={whatsappIcon} alt="" style={{ width: "1.5rem", height: "1.5rem" }} />
                      {t("signup.status.whatsappGroupButtonText")}
                    </TrackedButton>
                  </div>

                  <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <button
                      onClick={onNewRegistration}
                      style={{
                        cursor: "pointer",
                        color: "#2563eb",
                        textDecoration: "underline",
                        fontSize: "0.95rem",
                        fontWeight: "500",
                        transition: "color 0.2s",
                        background: "none",
                        border: "none",
                        padding: "0",
                        font: "inherit",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#1d4ed8")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#2563eb")}
                    >
                      {t("signup.status.newRegistration")}
                    </button>
                  </div>

                  <WarningNote style={{ marginTop: "1.5rem" }}>
                    <SignupWarningIcon>⚠️</SignupWarningIcon>
                    <span>{t("signup.status.paidWarning")}</span>
                  </WarningNote>
                </>
              )}
            </>
          )}
        </SignupCard>
      </Container>
    </SignupSectionWrapper>
  );
};

export default SignupSection;
