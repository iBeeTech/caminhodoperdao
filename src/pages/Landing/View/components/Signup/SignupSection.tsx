import React, { ChangeEvent, FormEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { AvailabilityState, LandingPhase, LandingTone } from "../../../Model";
import { Button, Callout, FormField, Input, Select } from "../../../../../components";
import {
  Container,
  MonasteryNote,
  PaidBox,
  PixActions,
  PixBox,
  PixLabel,
  PixTextarea,
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
}

interface SignupSectionProps {
  availability: AvailabilityState;
  phase: LandingPhase;
  errors: Record<string, string>;
  statusMessage: string | null;
  statusTone: LandingTone;
  currentStatus: string | null;
  qrCodeText: string | null;
  capacityCallout: string | null;
  isCheckingStatus: boolean;
  isSubmittingRegistration: boolean;
  isSleepLocked: boolean;
  refs: SignupRefs;
  onCheckStatus: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitRegistration: (event: FormEvent<HTMLFormElement>) => void;
  onPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCepChange: (event: ChangeEvent<HTMLInputElement>) => void;
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
  capacityCallout,
  isCheckingStatus,
  isSubmittingRegistration,
  isSleepLocked,
  refs,
  onCheckStatus,
  onSubmitRegistration,
  onPhoneChange,
  onCepChange,
  onReopenRegistration,
}) => {
  const { t } = useTranslation();
  const hasAvailabilityError = Boolean(availability.error);
  const showCheckForm = !hasAvailabilityError && phase === "check" && !availability.totalFull;
  const showRegistrationForm = !hasAvailabilityError && phase === "form" && !availability.totalFull;
  const showStatus = !hasAvailabilityError && phase === "status";

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

          {capacityCallout && <Callout variant="warning">{capacityCallout}</Callout>}
          {hasAvailabilityError && <Callout variant="warning">{t("signup.callouts.availabilityError")}</Callout>}
          {availability.totalFull && phase !== "status" && !capacityCallout && (
            <Callout variant="warning">{t("signup.callouts.full")}</Callout>
          )}

          {showCheckForm && (
            <SignupForm noValidate onSubmit={onCheckStatus}>
              <FormField label={t("signup.checkForm.nameLabel")} htmlFor="name" error={errors.name}>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t("signup.checkForm.namePlaceholder")}
                  ref={nameRef as RefObject<HTMLInputElement>}
                />
              </FormField>
              <FormField label={t("signup.checkForm.emailLabel")} htmlFor="email" error={errors.email}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("signup.checkForm.emailPlaceholder")}
                  ref={emailRef as RefObject<HTMLInputElement>}
                />
              </FormField>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isCheckingStatus || availability.loading}
                loading={isCheckingStatus}
              >
                {isCheckingStatus ? t("signup.checkForm.loading") : t("signup.checkForm.submit")}
              </Button>
            </SignupForm>
          )}

          {showRegistrationForm && (
            <SignupForm noValidate onSubmit={onSubmitRegistration}>
              <FormField label={t("signup.registrationForm.nameLabel")} htmlFor="name-full" error={errors.name}>
                <Input
                  id="name-full"
                  name="name-full"
                  type="text"
                  placeholder={t("signup.registrationForm.namePlaceholder")}
                  ref={nameRef as RefObject<HTMLInputElement>}
                />
              </FormField>
              <FormField label={t("signup.registrationForm.emailLabel")} htmlFor="email-full" error={errors.email}>
                <Input
                  id="email-full"
                  name="email-full"
                  type="email"
                  placeholder={t("signup.registrationForm.emailPlaceholder")}
                  ref={emailRef as RefObject<HTMLInputElement>}
                />
              </FormField>
              <FormField label={t("signup.registrationForm.whatsappLabel")} htmlFor="phone" error={errors.phone}>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  placeholder={t("signup.registrationForm.whatsappPlaceholder")}
                  ref={phoneRef as RefObject<HTMLInputElement>}
                  onChange={onPhoneChange}
                />
              </FormField>
              <FormField label={t("signup.registrationForm.cepLabel")} htmlFor="cep" error={errors.cep}>
                <Input
                  id="cep"
                  name="cep"
                  type="text"
                  placeholder={t("signup.registrationForm.cepPlaceholder")}
                  ref={cepRef as RefObject<HTMLInputElement>}
                  onChange={onCepChange}
                />
              </FormField>
              <FormField label={t("signup.registrationForm.addressLabel")} htmlFor="address" error={errors.address}>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  placeholder={t("signup.registrationForm.addressPlaceholder")}
                  ref={addressRef as RefObject<HTMLInputElement>}
                />
              </FormField>
              <FormField label={t("signup.registrationForm.numberLabel")} htmlFor="number" error={errors.number}>
                <Input
                  id="number"
                  name="number"
                  type="text"
                  placeholder={t("signup.registrationForm.numberPlaceholder")}
                  ref={numberRef as RefObject<HTMLInputElement>}
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
                />
              </FormField>
              <FormField label={t("signup.registrationForm.cityLabel")} htmlFor="city" error={errors.city}>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  placeholder={t("signup.registrationForm.cityPlaceholder")}
                  ref={cityRef as RefObject<HTMLInputElement>}
                />
              </FormField>
              <FormField label={t("signup.registrationForm.stateLabel")} htmlFor="state" error={errors.state}>
                <Input
                  id="state"
                  name="state"
                  type="text"
                  maxLength={2}
                  placeholder={t("signup.registrationForm.statePlaceholder")}
                  ref={stateRef as RefObject<HTMLInputElement>}
                />
              </FormField>
              <FormField
                label={t("signup.registrationForm.sleepQuestion")}
                htmlFor="sleepAtMonastery"
                error={errors.sleepAtMonastery}
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
              <Button variant="primary" size="md" type="submit" disabled={isSubmittingRegistration} loading={isSubmittingRegistration}>
                {isSubmittingRegistration ? t("signup.registrationForm.loading") : t("signup.registrationForm.submit")}
              </Button>
            </SignupForm>
          )}

          {showStatus && (
            <>
              {statusMessage && <StatusMessage $tone={statusTone}>{statusMessage}</StatusMessage>}

              {currentStatus === "PENDING" && (
                <PixBox>
                    <PixLabel>{t("signup.status.pixCopyLabel")}</PixLabel>
                    <PixTextarea readOnly value={qrCodeText ?? (t("signup.status.pixPendingPlaceholder") as string)} />
                </PixBox>
              )}

              {currentStatus === "CANCELED" && (
                <PixBox>
                    <PixLabel>{t("signup.status.pixExpiredLabel")}</PixLabel>
                  <PixActions>
                    <Button variant="primary" size="sm" onClick={onReopenRegistration}>
                        {t("signup.status.reopen")}
                    </Button>
                  </PixActions>
                </PixBox>
              )}

              {currentStatus === "PAID" && (
                <>
                    <PaidBox>{t("signup.status.paidBox")}</PaidBox>
                  <WarningNote>
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
