import React, { ChangeEvent, FormEvent, RefObject, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { landingService } from "../../../../../services/landing/landing.service";
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
  ConfirmationModalActions,
  ConfirmationModalClose,
  ConfirmationModalDescription,
  ConfirmationModalDialog,
  ConfirmationModalOverlay,
  ConfirmationModalTitle,
  SignupHeader,
  SignupSectionWrapper,
  SignupForm,
  SignupWarningIcon,
  StatusMessage,
  IntentContainer,
  PricingNote,
  PricingItem,
  IntentTitle,
  IntentGrid,
  IntentButton,
  BackButton,
  CancelRegistrationButton,
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
  onEmailBlur: () => void;
  onEmailChange: (value: string) => void;
  onClearFieldError: (field: string) => void;
  onReopenRegistration: () => void;
  onNewRegistration: () => void;
  onChooseRegister: () => void;
  onChooseCheck: () => void;
  onBackToIntent: () => void;
  registerIntent: boolean;
  registeredAsStaff: boolean;
  onViewMyRegistration: () => void;
  onCancelRegistration: () => Promise<void>;
  /** CPF (dígitos) da inscrição consultada — usado na troca geral↔pernoite. */
  registrationCpf: string | null;
  /** Modalidade atual da inscrição consultada: 1 = pernoite, 0 = geral. */
  sleepAtMonastery: number | null;
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
  onEmailChange,
  onClearFieldError,
  onReopenRegistration,
  onNewRegistration,
  onChooseRegister,
  onChooseCheck,
  onBackToIntent,
  registerIntent,
  registeredAsStaff,
  onViewMyRegistration,
  onCancelRegistration,
  registrationCpf,
  sleepAtMonastery,
  onCpfChange,
  onPhoneChangeError,
  onTermsChange,
  onEmergencyContactNameChange,
  onEmergencyContactPhoneChange,
}) => {
  const [hasAllergyMedication, setHasAllergyMedication] = useState<string>("");
  const [hasDietaryRestriction, setHasDietaryRestriction] = useState<string>("");
  const [copiedBrcode, setCopiedBrcode] = useState(false);
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCanceledModalOpen, setIsCanceledModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { t } = useTranslation("landing");
  const { isEnabled: enrollmentEnabled } = useFeatureFlags("enrollment");

  const openCancelModal = () => {
    setCancelError(null);
    setIsCancelOpen(true);
  };

  // Número fixo e exclusivo para estorno (não usar o round robin).
  const REFUND_WA_NUMBER = "5534992896160";
  const refundWaUrl = `https://wa.me/${REFUND_WA_NUMBER}?text=${encodeURIComponent(
    t("cancellation.refundWhatsappMessage", { ns: "common" })
  )}`;

  const confirmCancelRegistration = async () => {
    setIsCanceling(true);
    setCancelError(null);
    try {
      await onCancelRegistration();
      setIsCancelOpen(false);
      setIsCanceledModalOpen(true);
    } catch {
      setCancelError(t("cancellation.error", { ns: "common" }));
    } finally {
      setIsCanceling(false);
    }
  };

  // ---- Troca geral <-> pernoite (self-service) ----
  const [localSleep, setLocalSleep] = useState<number | null>(sleepAtMonastery);
  useEffect(() => {
    setLocalSleep(sleepAtMonastery);
  }, [sleepAtMonastery]);

  type SwitchPhase = "idle" | "processing" | "paying" | "done" | "error";
  const [switchPhase, setSwitchPhase] = useState<SwitchPhase>("idle");
  const [switchMsg, setSwitchMsg] = useState<string | null>(null);
  const [switchQr, setSwitchQr] = useState<{
    text: string | null;
    image: string | null;
    target: "monastery" | "general";
  } | null>(null);
  const [switchCopied, setSwitchCopied] = useState(false);

  const formatBRLFromCents = (cents: number) =>
    (Math.max(0, cents) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleSwitchLodging = async (target: "monastery" | "general") => {
    if (!registrationCpf) return;
    setSwitchPhase("processing");
    setSwitchMsg(null);
    setSwitchQr(null);
    try {
      const res = await landingService.changeLodging(registrationCpf, target);
      if (res.status === "PENDING" && res.needsPayment) {
        setSwitchQr({ text: res.qrCodeText ?? null, image: res.qrCodeImageUrl ?? null, target });
        const amount = formatBRLFromCents(res.amount_cents ?? 0);
        setSwitchMsg(
          res.kind === "difference"
            ? t("signup.status.switchPayDiff", { amount })
            : t("signup.status.switchPayFull", { amount })
        );
        setSwitchPhase("paying");
        return;
      }
      if (res.status === "DOWNGRADED") {
        setLocalSleep(0);
        setSwitchMsg(
          t("signup.status.switchDowngraded", { amount: formatBRLFromCents(res.refund_cents ?? 0) })
        );
        setSwitchPhase("done");
        return;
      }
      if (res.status === "UPGRADED" || res.status === "ALREADY_MONASTERY") {
        setLocalSleep(1);
        setSwitchMsg(t("signup.status.switchDone"));
        setSwitchPhase("done");
        return;
      }
      if (res.status === "ALREADY_GENERAL") {
        setLocalSleep(0);
        setSwitchMsg(t("signup.status.switchDone"));
        setSwitchPhase("done");
        return;
      }
      setSwitchPhase("error");
      setSwitchMsg(t("signup.status.switchError"));
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const body = err?.body ?? err?.data ?? err?.response?.body;
      setSwitchMsg(
        status === 409 && body?.error === "monastery_full"
          ? t("signup.status.switchMonasteryFull")
          : t("signup.status.switchError")
      );
      setSwitchPhase("error");
    }
  };

  // Confirma a troca quando o pagamento (diferença ou valor cheio) é compensado.
  useEffect(() => {
    if (switchPhase !== "paying" || !registrationCpf || !switchQr) return;
    let cancelled = false;
    const targetFlag = switchQr.target === "monastery" ? 1 : 0;
    const poll = async () => {
      try {
        const r = await landingService.checkStatus(registrationCpf);
        if (cancelled) return;
        if (r?.status === "PAID" && r.sleep_at_monastery === targetFlag) {
          setLocalSleep(targetFlag);
          setSwitchMsg(t("signup.status.switchDone"));
          setSwitchPhase("done");
        }
      } catch {
        /* mantém aguardando; usuário pode recarregar */
      }
    };
    poll();
    const id = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [switchPhase, registrationCpf, switchQr, t]);

  const statusRole = statusTone === "error" ? "alert" : "status";
  const statusLive = statusTone === "error" ? "assertive" : "polite";
  const pixTextareaId = "pix-code";

  const hasAvailabilityError = Boolean(availability.error);
  // Mesmo lotado (totalFull), a intenção e a conferência continuam acessíveis: só o
  // "Quero me inscrever" é desabilitado, mas o "Já me inscrevi" precisa funcionar para
  // permitir trocas (geral<->pernoite) e cancelamentos quando o evento está cheio.
  const showIntent = !hasAvailabilityError && phase === "intent" && enrollmentEnabled;
  const showCheckForm = !hasAvailabilityError && phase === "check" && enrollmentEnabled;
  const showAlreadyRegistered =
    !hasAvailabilityError && phase === "alreadyRegistered" && enrollmentEnabled;
  const showRegistrationForm = !hasAvailabilityError && phase === "form" && !availability.totalFull && enrollmentEnabled;
  const showStatus = !hasAvailabilityError && phase === "status" && enrollmentEnabled;

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

  React.useEffect(() => {
    // O modal do grupo de WhatsApp só aparece ao exibir o status de fato (peregrino pago),
    // não no aviso "você está inscrito como Staff" nem em outros estados.
    setIsPaidModalOpen(currentStatus === "PAID" && phase === "status");
  }, [currentStatus, phase]);

  const handleWhatsappGroupClick = () => {
    if (window && (window as any).analytics) {
      (window as any).analytics.track && (window as any).analytics.track("whatsapp_signup_button_click");
    }
    window.open("https://chat.whatsapp.com/FBuIFntCDpxGceChM6zNNa", "_blank");
  };

  const handleCpfChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.target.value = formatCpfBR(event.target.value);
  };

  const handleCheckSubmit = (event: FormEvent<HTMLFormElement>) => {
    onCheckStatus(event);
  };

  const handleRegistrationSubmit = (event: FormEvent<HTMLFormElement>) => {
    onEmailBlur();
    onSubmitRegistration(event);
  };

  return (
    <SignupSectionWrapper id="registration-form">
      <Container>
        <SignupCard>
          <SignupHeader>
            <h2>
              {phase === "check"
                ? registerIntent
                  ? t("signup.registrationForm.title")
                  : t("signup.checkForm.title")
                : phase === "form"
                ? t("signup.registrationForm.title")
                : t("signup.title")}
            </h2>
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
            {availability.totalFull &&
              phase !== "status" &&
              phase !== "intent" &&
              phase !== "check" &&
              !capacityCallout && (
                <Callout variant="warning">{t("signup.callouts.full")}</Callout>
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

          {showIntent && (
            <IntentContainer>
              <IntentTitle>{t("signup.intent.title")}</IntentTitle>
              <PricingNote>
                <PricingItem>
                  {t("signup.intent.pricing.withoutLodgingLabel")}{" "}
                  <strong>{t("signup.intent.pricing.withoutLodgingPrice")}</strong>
                </PricingItem>
                <PricingItem>
                  {t("signup.intent.pricing.withLodgingLabel")}{" "}
                  <strong>{t("signup.intent.pricing.withLodgingPrice")}</strong>
                </PricingItem>
              </PricingNote>
              <IntentGrid>
                {availability.totalFull ? (
                  <IntentButton
                    type="button"
                    disabled
                    style={{ opacity: 0.55, cursor: "not-allowed" }}
                  >
                    <strong>{t("signup.intent.soldOutTitle")}</strong>
                  </IntentButton>
                ) : (
                  <IntentButton type="button" onClick={onChooseRegister}>
                    <strong>{t("signup.intent.registerTitle")} →</strong>
                    <span>{t("signup.intent.registerHint")}</span>
                  </IntentButton>
                )}
                <IntentButton type="button" onClick={onChooseCheck}>
                  <strong>{t("signup.intent.checkTitle")} →</strong>
                  <span>{t("signup.intent.checkHint")}</span>
                </IntentButton>
              </IntentGrid>

              {availability.totalFull &&
                !availability.monasteryFull &&
                (availability.monasterySpotsLeft ?? 0) > 0 && (
                  <p
                    style={{
                      marginTop: "1rem",
                      textAlign: "center",
                      color: "#a15c00",
                      fontWeight: 600,
                      lineHeight: 1.45,
                    }}
                  >
                    {t("signup.intent.soldOutMonasterySpots", {
                      count: availability.monasterySpotsLeft ?? 0,
                    })}
                  </p>
                )}
            </IntentContainer>
          )}

          {showAlreadyRegistered && (
            <IntentContainer>
              <BackButton type="button" onClick={onBackToIntent}>
                ← {t("signup.back")}
              </BackButton>
              <Callout variant="warning">
                {registeredAsStaff
                  ? t("signup.registeredAsStaff")
                  : t("signup.alreadyRegistered.message")}
              </Callout>
              {!registeredAsStaff && (
                <TrackedButton
                  pageName="landing"
                  ctaId={LANDING_CTAS.FORM_CHECK_STATUS}
                  sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                  sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                  position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                  variant="primary"
                  size="md"
                  type="button"
                  onClick={onViewMyRegistration}
                >
                  {t("signup.alreadyRegistered.button")}
                </TrackedButton>
              )}
            </IntentContainer>
          )}

          {showCheckForm && (
            <SignupForm noValidate onSubmit={handleCheckSubmit}>
              <BackButton type="button" onClick={onBackToIntent}>
                ← {t("signup.back")}
              </BackButton>
              {registerIntent && (
                <p style={{ margin: 0, color: "#4b5563" }}>{t("signup.registerCheck.subtitle")}</p>
              )}
              {/* "Já me inscrevi" confere apenas pelo CPF; o nome só é pedido no
                  fluxo de inscrição (para pré-preencher o formulário). */}
              {registerIntent && (
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
              )}

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
                disabled={isCheckingStatus || availability.loading}
                loading={isCheckingStatus}
              >
                {isCheckingStatus
                  ? t("signup.checkForm.loading")
                  : registerIntent
                  ? t("signup.registerCheck.submit")
                  : t("signup.checkForm.submit")}
              </TrackedButton>
            </SignupForm>
          )}

          {showRegistrationForm && (
            <SignupForm noValidate onSubmit={handleRegistrationSubmit}>
              <BackButton type="button" onClick={onBackToIntent}>
                ← {t("signup.back")}
              </BackButton>
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
                  onBlur={onEmailBlur}
                  onChange={(event) => onEmailChange(event.target.value)}
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
                  onChange={(event) => {
                    onCepChange(event);
                    onClearFieldError("cep");
                  }}
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
                  onChange={() => onClearFieldError("address")}
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
                  onChange={() => onClearFieldError("number")}
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
                  onChange={() => onClearFieldError("city")}
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
                  onChange={() => onClearFieldError("state")}
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
                    onChange={() => {
                      onClearFieldError("sleepAtMonastery");
                    }}
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
                      onChange={() => {
                        setHasAllergyMedication("yes");
                        onClearFieldError("allergyMedication");
                      }}
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
                        onClearFieldError("allergyMedication");
                        onClearFieldError("allergyMedicationDetails");
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
                    onChange={() => onClearFieldError("allergyMedicationDetails")}
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
                      onChange={() => {
                        setHasDietaryRestriction("yes");
                        onClearFieldError("dietaryRestriction");
                      }}
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
                        onClearFieldError("dietaryRestriction");
                        onClearFieldError("dietaryRestrictionDetails");
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
                    onChange={() => onClearFieldError("dietaryRestrictionDetails")}
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
                disabled={isSubmittingRegistration || Boolean(errors.termsAccepted) || Boolean(errors.emergencyContactName) || Boolean(errors.emergencyContactPhone)}
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
                </>
              )}

              {(currentStatus === "PAID" || currentStatus === "PENDING") && (
                <div
                  style={{
                    marginTop: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  {/* Troca geral <-> pernoite (self-service) */}
                  {switchPhase === "idle" && localSleep !== null && (
                    <button
                      type="button"
                      onClick={() => handleSwitchLodging(localSleep === 1 ? "general" : "monastery")}
                      style={{
                        cursor: "pointer",
                        color: "#2563eb",
                        textDecoration: "underline",
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        background: "none",
                        border: "none",
                        padding: 0,
                        font: "inherit",
                      }}
                    >
                      {localSleep === 1
                        ? t("signup.status.switchToGeneral")
                        : t("signup.status.switchToMonastery")}
                    </button>
                  )}

                  {switchPhase === "processing" && (
                    <div style={{ color: "#555" }}>{t("signup.status.switchProcessing")}</div>
                  )}

                  {switchPhase === "paying" && switchQr && (
                    <PixBox>
                      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                        <strong>{t("signup.status.switchPayTitle")}</strong>
                        {switchMsg && <p style={{ color: "#555", marginTop: "0.5rem" }}>{switchMsg}</p>}
                        <p
                          style={{
                            color: "#dc2626",
                            fontSize: "1.15rem",
                            fontWeight: 700,
                            marginTop: "0.5rem",
                            lineHeight: 1.4,
                          }}
                        >
                          {t("signup.status.switchPayWarning")}
                        </p>
                      </div>
                      <PixLabelContainer>
                        <PixLabel htmlFor="switch-pix-code">{t("signup.status.pixCopyLabel")}</PixLabel>
                        <CopyButton
                          type="button"
                          onClick={() => {
                            if (switchQr.text && navigator.clipboard) {
                              navigator.clipboard.writeText(switchQr.text);
                              setSwitchCopied(true);
                              window.setTimeout(() => setSwitchCopied(false), 2000);
                            }
                          }}
                        >
                          <span>{switchCopied ? "✓" : "📋"}</span>
                          <span>
                            {switchCopied
                              ? t("signup.status.copyCopied")
                              : t("signup.status.copyAction")}
                          </span>
                        </CopyButton>
                      </PixLabelContainer>
                      <PixTextarea
                        id="switch-pix-code"
                        readOnly
                        value={switchQr.text ?? (t("signup.status.pixPendingPlaceholder") as string)}
                      />
                      {switchQr.image && (
                        <QRCodeContainer>
                          <QRCodeImage src={switchQr.image} alt={t("signup.status.qrCodeAlt")} />
                        </QRCodeContainer>
                      )}
                    </PixBox>
                  )}

                  {switchPhase === "done" && switchMsg && (
                    <div
                      style={{
                        color: "#166534",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: 8,
                        padding: "0.75rem 1rem",
                        textAlign: "center",
                      }}
                    >
                      {switchMsg}
                    </div>
                  )}

                  {switchPhase === "error" && (
                    <div
                      style={{
                        color: "#991b1b",
                        background: "#fef2f2",
                        border: "1px solid #fecdd3",
                        borderRadius: 8,
                        padding: "0.75rem 1rem",
                        textAlign: "center",
                      }}
                    >
                      {switchMsg}{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setSwitchPhase("idle");
                          setSwitchMsg(null);
                        }}
                        style={{
                          marginLeft: 6,
                          textDecoration: "underline",
                          background: "none",
                          border: "none",
                          color: "#991b1b",
                          cursor: "pointer",
                          font: "inherit",
                        }}
                      >
                        Tentar de novo
                      </button>
                    </div>
                  )}

                  <CancelRegistrationButton type="button" onClick={openCancelModal}>
                    {t("signup.status.cancelRegistration")}
                  </CancelRegistrationButton>
                </div>
              )}
            </>
          )}

          {isPaidModalOpen && (
            <ConfirmationModalOverlay onClick={() => setIsPaidModalOpen(false)}>
              <ConfirmationModalDialog
                role="dialog"
                aria-modal="true"
                aria-labelledby="paid-confirmation-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <ConfirmationModalClose
                  type="button"
                  aria-label={t("cancellation.close", { ns: "common" })}
                  onClick={() => setIsPaidModalOpen(false)}
                >
                  ×
                </ConfirmationModalClose>

                <ConfirmationModalTitle id="paid-confirmation-modal-title">
                  {t("cancellation.title", { ns: "common" })}
                </ConfirmationModalTitle>

                <ConfirmationModalDescription>
                  {t("cancellation.notice", { ns: "common" })}
                </ConfirmationModalDescription>

                <style>{`
                  @keyframes floating {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                  }
                  .whatsapp-button { animation: floating 3s ease-in-out infinite; }
                `}</style>

                <ConfirmationModalActions>
                  <TrackedButton
                    pageName="landing"
                    ctaId={LANDING_CTAS.FORM_SUBMIT}
                    sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                    sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                    position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                    variant="primary"
                    size="md"
                    onClick={handleWhatsappGroupClick}
                    className="whatsapp-button"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  >
                    <img src={whatsappIcon} alt="" style={{ width: "1.5rem", height: "1.5rem" }} />
                    {t("signup.status.whatsappGroupButtonText")}
                  </TrackedButton>
                </ConfirmationModalActions>
              </ConfirmationModalDialog>
            </ConfirmationModalOverlay>
          )}

          {isCancelOpen && (
            <ConfirmationModalOverlay onClick={() => !isCanceling && setIsCancelOpen(false)}>
              <ConfirmationModalDialog
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-registration-modal-title"
                onClick={event => event.stopPropagation()}
              >
                <ConfirmationModalClose
                  type="button"
                  aria-label={t("cancellation.close", { ns: "common" })}
                  onClick={() => setIsCancelOpen(false)}
                  disabled={isCanceling}
                >
                  ×
                </ConfirmationModalClose>

                <ConfirmationModalTitle id="cancel-registration-modal-title">
                  {t("cancellation.title", { ns: "common" })}
                </ConfirmationModalTitle>

                <ConfirmationModalDescription>
                  {t("cancellation.notice", { ns: "common" })}
                </ConfirmationModalDescription>

                {cancelError && <ErrorText role="alert">{cancelError}</ErrorText>}

                <ConfirmationModalActions>
                  <TrackedButton
                    pageName="landing"
                    ctaId={LANDING_CTAS.FORM_SUBMIT}
                    sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                    sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                    position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                    variant="secondary"
                    size="md"
                    type="button"
                    onClick={() => setIsCancelOpen(false)}
                    disabled={isCanceling}
                  >
                    {t("cancellation.exit", { ns: "common" })}
                  </TrackedButton>
                  <TrackedButton
                    pageName="landing"
                    ctaId={LANDING_CTAS.FORM_SUBMIT}
                    sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                    sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                    position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                    variant="primary"
                    size="md"
                    type="button"
                    onClick={confirmCancelRegistration}
                    disabled={isCanceling}
                    loading={isCanceling}
                  >
                    {t("cancellation.confirm", { ns: "common" })}
                  </TrackedButton>
                </ConfirmationModalActions>
              </ConfirmationModalDialog>
            </ConfirmationModalOverlay>
          )}

          {isCanceledModalOpen && (
            <ConfirmationModalOverlay onClick={() => setIsCanceledModalOpen(false)}>
              <ConfirmationModalDialog
                role="dialog"
                aria-modal="true"
                aria-labelledby="canceled-registration-modal-title"
                onClick={event => event.stopPropagation()}
              >
                <ConfirmationModalClose
                  type="button"
                  aria-label={t("cancellation.canceledClose", { ns: "common" })}
                  onClick={() => setIsCanceledModalOpen(false)}
                >
                  ×
                </ConfirmationModalClose>

                <ConfirmationModalTitle id="canceled-registration-modal-title">
                  {t("cancellation.canceledTitle", { ns: "common" })}
                </ConfirmationModalTitle>

                <ConfirmationModalDescription>
                  {t("cancellation.canceledNotice", { ns: "common" })}
                </ConfirmationModalDescription>

                <a
                  href={refundWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    background: "#25d366",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <img src={whatsappIcon} alt="" style={{ width: "1.25rem", height: "1.25rem" }} />
                  {t("cancellation.refundWhatsapp", { ns: "common" })}
                </a>

                <ConfirmationModalActions>
                  <TrackedButton
                    pageName="landing"
                    ctaId={LANDING_CTAS.FORM_SUBMIT}
                    sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                    sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                    position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                    variant="secondary"
                    size="md"
                    type="button"
                    onClick={() => setIsCanceledModalOpen(false)}
                  >
                    {t("cancellation.canceledClose", { ns: "common" })}
                  </TrackedButton>
                </ConfirmationModalActions>
              </ConfirmationModalDialog>
            </ConfirmationModalOverlay>
          )}
        </SignupCard>
      </Container>
    </SignupSectionWrapper>
  );
};

export default SignupSection;
