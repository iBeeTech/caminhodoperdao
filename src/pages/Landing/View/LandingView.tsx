import React, { ChangeEvent, FormEvent, RefObject } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../../../components";
import logo from "../../../assets/logo.png";
import { AvailabilityState, LandingContent, LandingPhase, LandingTone } from "../Model";
import TrackSection from "../../../components/analytics/TrackSection";
import { LANDING_SECTIONS } from "../../../utils/analytics/catalog/sections";
import {
  CtaSection,
  FeaturesSection,
  FooterSection,
  HeroSection,
  HistorySection,
  ScheduleSection,
  SignupSection,
  TshirtPurchaseSection,
  TestimonialsSection,
} from "./components";
import { LandingPage, MainContent } from "./LandingView.styles";

const toCamelCase = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
    .replace(/[^a-z0-9]/g, "")
    .replace(/^[A-Z]/, (first) => first.toLowerCase());

interface LandingViewProps {
  content: LandingContent;
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
  refs: {
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
  };
  onCheckStatus: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitRegistration: (event: FormEvent<HTMLFormElement>) => void;
  onPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCepChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEmailBlur: () => void;
  onEmailChange: (value: string) => void;
  onClearFieldError: (field: string) => void;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onCallToAction: () => void;
  onReopenRegistration: () => void;
  onNewRegistration: () => void;
  onChooseRegister: () => void;
  onChooseCheck: () => void;
  onBackToIntent: () => void;
  registerIntent: boolean;
  onViewMyRegistration: () => void;
  onCancelRegistration: () => Promise<void>;
  getNextWhatsappUrl: (opts?: { depoimento?: boolean }) => Promise<string>;
  onCpfChange?: () => void;
  onPhoneChangeError?: () => void;
  onTermsChange?: () => void;
  onEmergencyContactNameChange?: () => void;
  onEmergencyContactPhoneChange?: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({
  content,
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
  onPrimaryAction,
  onSecondaryAction,
  onCallToAction,
  onReopenRegistration,
  onNewRegistration,
  onChooseRegister,
  onChooseCheck,
  onBackToIntent,
  registerIntent,
  onViewMyRegistration,
  onCancelRegistration,
  getNextWhatsappUrl,
  onCpfChange,
  onPhoneChangeError,
  onTermsChange,
  onEmergencyContactNameChange,
  onEmergencyContactPhoneChange,
}) => {
  const formSectionProps = statusMessage ? { message_camel_case: toCamelCase(statusMessage) } : undefined;
  const [searchParams] = useSearchParams();
  const isTshirtSectionEnabled = searchParams.get("tshirt") === "on";
  return (
    <LandingPage>
      <Header />

      <MainContent id="main-content">
        <TrackSection
          pageName="landing"
          sectionId={LANDING_SECTIONS.HERO.id}
          sectionName={LANDING_SECTIONS.HERO.name}
          position={LANDING_SECTIONS.HERO.position}
        >
          <HeroSection
            hero={content.hero}
            heroImage={logo}
            onPrimaryAction={onPrimaryAction}
            onSecondaryAction={onSecondaryAction}
          />
        </TrackSection>

        {isTshirtSectionEnabled && (
          <TrackSection
            pageName="landing"
            sectionId={LANDING_SECTIONS.TSHIRT_PURCHASE.id}
            sectionName={LANDING_SECTIONS.TSHIRT_PURCHASE.name}
            position={LANDING_SECTIONS.TSHIRT_PURCHASE.position}
            eventType="form_section"
          >
            <TshirtPurchaseSection />
          </TrackSection>
        )}

        <TrackSection
          pageName="landing"
          sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
          sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
          position={LANDING_SECTIONS.REGISTRATION_FORM.position}
          eventType="form_section"
          additionalProps={formSectionProps}
        >
          <SignupSection
            availability={availability}
            phase={phase}
            errors={errors}
            statusMessage={statusMessage}
            statusTone={statusTone}
            currentStatus={currentStatus}
            qrCodeText={qrCodeText}
            qrCodeImageUrl={qrCodeImageUrl}
            capacityCallout={capacityCallout}
            isCheckingStatus={isCheckingStatus}
            isSubmittingRegistration={isSubmittingRegistration}
            isSleepLocked={isSleepLocked}
            refs={refs}
            onCheckStatus={onCheckStatus}
            onSubmitRegistration={onSubmitRegistration}
            onPhoneChange={onPhoneChange}
            onCepChange={onCepChange}
            onEmailBlur={onEmailBlur}
            onEmailChange={onEmailChange}
            onClearFieldError={onClearFieldError}
            onReopenRegistration={onReopenRegistration}
            onNewRegistration={onNewRegistration}
            onChooseRegister={onChooseRegister}
            onChooseCheck={onChooseCheck}
            onBackToIntent={onBackToIntent}
            registerIntent={registerIntent}
            onViewMyRegistration={onViewMyRegistration}
            onCancelRegistration={onCancelRegistration}
            getNextWhatsappUrl={getNextWhatsappUrl}
            onCpfChange={onCpfChange}
            onPhoneChangeError={onPhoneChangeError}
            onTermsChange={onTermsChange}
            onEmergencyContactNameChange={onEmergencyContactNameChange}
            onEmergencyContactPhoneChange={onEmergencyContactPhoneChange}
          />
        </TrackSection>

        <TrackSection
          pageName="landing"
          sectionId={LANDING_SECTIONS.SCHEDULE.id}
          sectionName={LANDING_SECTIONS.SCHEDULE.name}
          position={LANDING_SECTIONS.SCHEDULE.position}
        >
          <ScheduleSection />
        </TrackSection>

        <TrackSection
          pageName="landing"
          sectionId={LANDING_SECTIONS.HISTORY.id}
          sectionName={LANDING_SECTIONS.HISTORY.name}
          position={LANDING_SECTIONS.HISTORY.position}
        >
          <HistorySection />
        </TrackSection>

        <TrackSection
          pageName="landing"
          sectionId={LANDING_SECTIONS.FEATURES.id}
          sectionName={LANDING_SECTIONS.FEATURES.name}
          position={LANDING_SECTIONS.FEATURES.position}
        >
          <FeaturesSection features={content.features} />
        </TrackSection>

        <TrackSection
          pageName="landing"
          sectionId={LANDING_SECTIONS.TESTIMONIALS.id}
          sectionName={LANDING_SECTIONS.TESTIMONIALS.name}
          position={LANDING_SECTIONS.TESTIMONIALS.position}
        >
          <TestimonialsSection getNextWhatsappUrl={getNextWhatsappUrl} />
        </TrackSection>

        <TrackSection
          pageName="landing"
          sectionId={LANDING_SECTIONS.CTA.id}
          sectionName={LANDING_SECTIONS.CTA.name}
          position={LANDING_SECTIONS.CTA.position}
        >
          <CtaSection callToAction={content.callToAction} onCallToAction={onCallToAction} />
        </TrackSection>
      </MainContent>

      <TrackSection
        pageName="landing"
        sectionId={LANDING_SECTIONS.FOOTER.id}
        sectionName={LANDING_SECTIONS.FOOTER.name}
        position={LANDING_SECTIONS.FOOTER.position}
        as="footer"
      >
        <FooterSection getNextWhatsappUrl={getNextWhatsappUrl} />
      </TrackSection>
    </LandingPage>
  );
};

export default LandingView;
