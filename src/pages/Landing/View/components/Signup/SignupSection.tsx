import React, { ChangeEvent, FormEvent, RefObject, useState } from "react";
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

interface SignupSectionProps {
  availability: AvailabilityState;
  phase: LandingPhase;
  errors: Record<string, string>;
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
  onReopenRegistration: () => void;
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

  const handleCopyBrcode = async () => {
    if (!qrCodeText) return;

    try {
      await navigator.clipboard.writeText(qrCodeText);
      setCopiedBrcode(true);
      setTimeout(() => setCopiedBrcode(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar PIX:', err);
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

          {showCheckForm && (
            <SignupForm noValidate onSubmit={onCheckStatus}>
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
              <FormField label={t("signup.checkForm.emailLabel")} htmlFor="email" error={errors.email} required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("signup.checkForm.emailPlaceholder")}
                  ref={emailRef as RefObject<HTMLInputElement>}
                  autoComplete="email"
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
                {isCheckingStatus ? t("signup.checkForm.loading") : t("signup.checkForm.submit")}
              </TrackedButton>
            </SignupForm>
          )}

          {showRegistrationForm && (
            <SignupForm noValidate onSubmit={onSubmitRegistration}>
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
              <FormField label={t("signup.registrationForm.emailLabel")} htmlFor="email-full" error={errors.email} required>
                <Input
                  id="email-full"
                  name="email-full"
                  type="email"
                  placeholder={t("signup.registrationForm.emailPlaceholder")}
                  ref={emailRef as RefObject<HTMLInputElement>}
                  onBlur={onEmailBlur}
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
              <FormField label={t("signup.registrationForm.complementLabel")}
                htmlFor="complement"
              >
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
                  <MonasteryNote>
                    {t("signup.registrationForm.sleepLocked")}
                  </MonasteryNote>
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
                      {availability.monasteryFull ? t("signup.registrationForm.sleepYesFull") : t("signup.registrationForm.sleepYes")}
                    </option>
                    <option value="no">{t("signup.registrationForm.sleepNo")}</option>
                  </Select>
                )}
              </FormField>
              {showRegistrationForm && sleepSelected === "yes" && (
                <FormField 
                  label={
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <img 
                        src={starIcon}
                        alt=""
                        style={{ width: "1rem", height: "1rem" }}
                      />
                      <span style={{ display: "inline" }}>Coloque</span>
                      abaixo o nome do <strong>Grupo</strong> OU <strong>Sobrenome</strong> da Família OU <strong>Nome Completo</strong> da pessoa que irá com você:
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
                disabled={isSubmittingRegistration}
                loading={isSubmittingRegistration}
              >
                {isSubmittingRegistration ? t("signup.registrationForm.loading") : t("signup.registrationForm.submit")}
              </TrackedButton>
            </SignupForm>
          )}

          {showStatus && (
            <>
              {statusMessage && currentStatus !== "PAID" && currentStatus !== "CANCELED" && (
                <StatusMessage
                  $tone={statusTone}
                  role={statusRole}
                  aria-live={statusLive}
                  tabIndex={-1}
                  style={{ fontSize: "1.05rem", textAlign: "center" }}
                >
                  {currentStatus === "PENDING" && (
                    <div style={{
                      fontWeight: "bold",
                      textAlign: "center",
                      textTransform: "uppercase",
                      marginBottom: "1rem",
                      fontSize: "1.1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem"
                    }}>
                      <img 
                        src={checkAmarelo} 
                        alt="Sucesso" 
                        style={{
                          width: "1.5rem",
                          height: "1.5rem",
                          animation: "scaleAndSpin 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
                        }}
                      />
                      Sua inscrição foi reservada!
                    </div>
                  )}
                  <style>{`
                    @keyframes scaleAndSpin {
                      0% {
                        transform: scale(0) rotate(-180deg);
                        opacity: 0;
                      }
                      50% {
                        transform: scale(1.1);
                      }
                      100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                      }
                    }
                  `}</style>
                  {statusMessage}
                </StatusMessage>
              )}

              {currentStatus === "PENDING" && (
                <PixBox>
                  {(() => {
                    const name = typeof window !== "undefined" ? sessionStorage.getItem("landing_registration_name") : null;
                    const email = typeof window !== "undefined" ? sessionStorage.getItem("landing_registration_email") : null;
                    if (name || email) {
                      return (
                        <div style={{ 
                          fontSize: "0.95rem", 
                          color: "#555", 
                          marginBottom: "1.5rem", 
                          textAlign: "center", 
                          padding: "1rem", 
                          backgroundColor: "#fef3c7", 
                          borderRadius: "8px",
                          borderLeft: "4px solid #f59e0b"
                        }}>
                          {name && <div style={{ marginBottom: "0.5rem" }}><strong>Nome:</strong> {name}</div>}
                          {email && <div><strong>Email:</strong> {email}</div>}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <PixLabelContainer>
                    <PixLabel htmlFor={pixTextareaId}>{t("signup.status.pixCopyLabel")}</PixLabel>
                    <CopyButton 
                      onClick={handleCopyBrcode}
                      title="Copiar código PIX"
                      aria-label="Copiar código PIX"
                    >
                      <span>{copiedBrcode ? '✓' : '📋'}</span>
                      <span>{copiedBrcode ? 'Copiado!' : 'Copiar'}</span>
                    </CopyButton>
                  </PixLabelContainer>
                  <PixTextarea
                    id={pixTextareaId}
                    readOnly
                    value={qrCodeText ?? (t("signup.status.pixPendingPlaceholder") as string)}
                  />
                  {qrCodeImageUrl && (
                    <QRCodeContainer>
                      <QRCodeImage 
                        src={qrCodeImageUrl} 
                        alt="QR Code PIX" 
                      />
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
                        font: "inherit"
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
                <PixBox style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem", backgroundColor: "#fef2f2", borderColor: "#fecdd3" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.5rem", fontWeight: "bold", textTransform: "uppercase", color: "#991b1b" }}>
                      Inscrição cancelada
                    </span>
                  </div>
                  <span style={{ fontSize: "0.95rem", color: "#991b1b", textAlign: "center" }}>
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
                    const name = typeof window !== "undefined" ? sessionStorage.getItem("landing_registration_name") : null;
                    const email = typeof window !== "undefined" ? sessionStorage.getItem("landing_registration_email") : null;
                    if (name || email) {
                      return (
                        <div style={{ 
                          fontSize: "0.95rem", 
                          color: "#555", 
                          marginBottom: "1.5rem", 
                          textAlign: "center",
                          padding: "1rem",
                          backgroundColor: "#f0f7ff",
                          borderRadius: "8px",
                          borderLeft: "4px solid #2563eb",
                          width: "100%"
                        }}>
                          {name && <div style={{ marginBottom: "0.5rem" }}><strong>Nome:</strong> {name}</div>}
                          {email && <div><strong>Email:</strong> {email}</div>}
                        </div>
                      );
                    }
                    return null;
                  })()}
                    <PaidBox style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                        <img 
                          src={check} 
                          alt="Confirmado" 
                          style={{
                            width: "1.5rem",
                            height: "1.5rem",
                            animation: "scaleAndSpin 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
                          }}
                        />
                        <span style={{ fontSize: "1.1rem", fontWeight: "bold", textTransform: "uppercase" }}>
                          Inscrição confirmada
                        </span>
                      </div>
                      <span style={{ fontSize: "1rem" }}>
                        {t("signup.status.paidBox")}
                      </span>
                    </PaidBox>
                    <style>{`
                      @keyframes scaleAndSpin {
                        0% {
                          transform: scale(0) rotate(-180deg);
                          opacity: 0;
                        }
                        50% {
                          transform: scale(1.1);
                        }
                        100% {
                          transform: scale(1) rotate(0deg);
                          opacity: 1;
                        }
                      }
                    `}</style>
                  <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                    <style>{`
                      @keyframes floating {
                        0%, 100% {
                          transform: translateY(0px);
                        }
                        50% {
                          transform: translateY(-8px);
                        }
                      }
                      .whatsapp-button {
                        animation: floating 3s ease-in-out infinite;
                      }
                    `}</style>
                    <TrackedButton
                      pageName="landing"
                      ctaId={LANDING_CTAS.FORM_SUBMIT}
                      sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
                      sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
                      position={LANDING_SECTIONS.REGISTRATION_FORM.position}
                      variant="primary"
                      size="md"
                      onClick={() => window.open("https://chat.whatsapp.com/seu-grupo-aqui", "_blank")}
                      className="whatsapp-button"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem"
                      }}
                    >
                      <img
                        src={whatsappIcon}
                        alt=""
                        style={{ width: "1.5rem", height: "1.5rem" }}
                      />
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
                        font: "inherit"
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
