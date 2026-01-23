import React, { ChangeEvent, FormEvent, RefObject, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AvailabilityState, LandingPhase, LandingTone } from "../../../Model";
import { Callout, FormField, Input, Select } from "../../../../../components";
import TrackedButton from "../../../../../components/analytics/TrackedButton";
import EnrollmentCallout from "../../../../../components/molecules/EnrollmentCallout/EnrollmentCallout";
import { useFeatureFlags } from "../../../../../hooks/useFeatureFlags";
import { LANDING_CTAS } from "../../../../../utils/analytics/catalog/ctas";
import { LANDING_SECTIONS } from "../../../../../utils/analytics/catalog/sections";
import checkAmarelo from "../../../../../assets/check-amarelo.png";
import check from "../../../../../assets/check.png";
import whatsappIcon from "../../../../../assets/whatsapp.png";
import starIcon from "../../../../../assets/star.png";
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
  phoneRef: RefObject<HTMLInputElement | null>;
  cepRef: RefObject<HTMLInputElement | null>;
  addressRef: RefObject<HTMLInputElement | null>;
  numberRef: RefObject<HTMLInputElement | null>;
  complementRef: RefObject<HTMLInputElement | null>;
  cityRef: RefObject<HTMLInputElement | null>;
  stateRef: RefObject<HTMLInputElement | null>;
  sleepAtMonasteryRef: RefObject<HTMLSelectElement | null>;
  companionRef: RefObject<HTMLInputElement | null>;
}

type SignupErrors = Partial<{
  name: string;
  email: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  city: string;
  state: string;
  sleepAtMonastery: string;
  emailUsedByOtherName: string;
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
  getNextWhatsappUrl: () => Promise<string>;
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
  getNextWhatsappUrl,
}) => {
  const [sleepSelected, setSleepSelected] = useState<string>("");
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
      console.error("Erro ao copiar PIX:", err);
    }
  };

  const {
    nameRef,
    emailRef,
    phoneRef,
    cepRef,
    addressRef,
    numberRef,
    complementRef,
    cityRef,
    stateRef,
    sleepAtMonasteryRef,
    companionRef,
  } = refs;

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
            <SignupBullets>
              {(t("signup.bullets", { returnObjects: true }) as string[]).map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </SignupBullets>
          </SignupHeader>

          <EnrollmentCallout />
          {capacityCallout && <Callout variant="warning">{capacityCallout}</Callout>}
          {hasAvailabilityError && <Callout variant="warning">{t("signup.callouts.availabilityError")}</Callout>}
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
                <img src={checkAmarelo} alt="Pendente" style={{ width: 32, height: 32 }} />
                SUA INSCRIÇÃO FOI RESERVADA!
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
                <div>Para finalizá-la, realize o pagamento do PIX, o qual irá se expirar em 24h.</div>
                <div>
                  Seu pagamento pode levar um tempo para ser processado, mas fique tranquilo que você receberá um e-mail
                  confirmando seu pagamento.
                </div>
                <div>
                  Você também pode fazer o reload da página e fornecer seu nome e email usados na inscrição para saber o
                  status dela a qualquer momento.
                </div>
              </div>
            </div>
          )}

          {showCheckForm && (
            <SignupForm noValidate onSubmit={handleCheckSubmit}>
              <FormField label={t("signup.checkForm.nameLabel")} htmlFor="name" error={errors.name} required>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t("signup.checkForm.namePlaceholder")}
                  ref={nameRef as RefObject<HTMLInputElement>}
                  autoComplete="name"
                />
              </FormField>

              <FormField label={t("signup.checkForm.emailLabel")} htmlFor="email" error={undefined} required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("signup.checkForm.emailPlaceholder")}
                  ref={emailRef as RefObject<HTMLInputElement>}
                  autoComplete="email"
                  onBlur={validateEmailNow} // ✅ agora valida no check também
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

              <FormField label={t("signup.registrationForm.whatsappLabel")} htmlFor="phone" error={errors.phone} required>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  placeholder={t("signup.registrationForm.whatsappPlaceholder")}
                  ref={phoneRef as RefObject<HTMLInputElement>}
                  onChange={onPhoneChange}
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
                      <span style={{ display: "inline" }}>Coloque</span>
                      abaixo o nome do <strong>Grupo</strong> OU <strong>Sobrenome</strong> da Família OU{" "}
                      <strong>Nome Completo</strong> da pessoa que irá com você:
                    </span>
                  }
                  htmlFor="companion"
                >
                  <Input
                    id="companion"
                    name="companion"
                    type="text"
                    placeholder="Família Silva ou Grupo Peregrinos do Amor ou Fulano de Tal"
                    ref={companionRef as RefObject<HTMLInputElement>}
                    autoComplete="off"
                  />
                </FormField>
              )}

              <TrackedButton
                pageName="landing"
                ctaId={LANDING_CTAS.FORM_SUBMIT}
                sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                variant="primary"
                size="md"
                type="submit"
                disabled={isSubmittingRegistration || Boolean(errors.emailUsedByOtherName)} // ✅ bloqueia submit com conflito
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
                              <strong>Nome:</strong> {name}
                            </div>
                          )}
                          {email && (
                            <div>
                              <strong>Email:</strong> {email}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <PixLabelContainer>
                    <PixLabel htmlFor={pixTextareaId}>{t("signup.status.pixCopyLabel")}</PixLabel>
                    <CopyButton onClick={handleCopyBrcode} title="Copiar código PIX" aria-label="Copiar código PIX">
                      <span>{copiedBrcode ? "✓" : "📋"}</span>
                      <span>{copiedBrcode ? "Copiado!" : "Copiar"}</span>
                    </CopyButton>
                  </PixLabelContainer>

                  <PixTextarea
                    id={pixTextareaId}
                    readOnly
                    value={qrCodeText ?? (t("signup.status.pixPendingPlaceholder") as string)}
                  />

                  {qrCodeImageUrl && (
                    <QRCodeContainer>
                      <QRCodeImage src={qrCodeImageUrl} alt="QR Code PIX" />
                    </QRCodeContainer>
                  )}

                  <PixActions style={{ marginTop: "1.5rem", justifyContent: "center" }}>
                    <button
                      onClick={onReopenRegistration}
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
                      Fazer nova inscrição
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
                      Inscrição cancelada
                    </span>
                  </div>

                  <span style={{ fontSize: "1.18rem", color: "#991b1b", textAlign: "center", fontWeight: 500 }}>
                    Devido ao PIX ter expirado. Refaça a inscrição e pague o PIX dentro de 24h para confirmá-la.
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
                              <strong>Nome:</strong> {name}
                            </div>
                          )}
                          {email && (
                            <div>
                              <strong>Email:</strong> {email}
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
                        alt="Confirmado"
                        style={{
                          width: "1.5rem",
                          height: "1.5rem",
                          animation: "scaleAndSpin 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                      />
                      <span style={{ fontSize: "1.1rem", fontWeight: "bold", textTransform: "uppercase" }}>
                        Inscrição confirmada
                      </span>
                    </div>

                    <span style={{ fontSize: "1rem" }}>{t("signup.status.paidBox")}</span>
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
                      onClick={async () => {
                        if (window && (window as any).analytics) {
                          (window as any).analytics.track && (window as any).analytics.track("whatsapp_signup_button_click");
                        }
                        const url = await getNextWhatsappUrl();
                        window.open(url, "_blank");
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
                      onClick={onReopenRegistration}
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
                      Fazer nova inscrição
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
