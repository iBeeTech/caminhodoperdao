import React, { ChangeEvent, FormEvent, RefObject } from "react";
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
  TestimonialsSection,
} from "./components";
import { LandingPage, MainContent } from "./LandingView.styles";

/**
 * \u26a0\ufe0f A home N\u00c3O tem mais inscri\u00e7\u00e3o nem venda de camiseta (04/08/2026).
 *
 * A inscri\u00e7\u00e3o passa a acontecer dentro da conta (ver Planning.md, bloco 1): o
 * e-mail do login \u00c9 o e-mail da inscri\u00e7\u00e3o, e some o buraco de "digite um CPF e
 * veja os dados daquela pessoa". A camiseta sai porque a venda encerrou e vira
 * a Loja (bloco 10) quando existir.
 *
 * `SignupSection` e `TshirtPurchaseSection` continuam no reposit\u00f3rio, e o
 * Controller continua alimentando as props delas: o formul\u00e1rio custou caro e a
 * inscri\u00e7\u00e3o da \u00e1rea logada vai reaproveit\u00e1-lo. Por isso a interface de props
 * segue inteira \u2014 o que mudou foi s\u00f3 o que a home RENDERIZA.
 */
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
    genderRef: RefObject<HTMLSelectElement | null>;
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
  registeredAsStaff: boolean;
  onViewMyRegistration: () => void;
  onCancelRegistration: (pixKey?: string) => Promise<void>;
  registrationCpf: string | null;
  sleepAtMonastery: number | null;
  getNextWhatsappUrl: (opts?: { depoimento?: boolean }) => Promise<string>;
  onCpfChange?: () => void;
  onPhoneChangeError?: () => void;
  onTermsChange?: () => void;
  onEmergencyContactNameChange?: () => void;
  onEmergencyContactPhoneChange?: () => void;
}

// Só o que a home ainda usa. As demais props seguem na interface porque o
// Controller continua enviando — e vão voltar a ser lidas quando a inscrição
// existir dentro da área logada.
const LandingView: React.FC<LandingViewProps> = ({
  content,
  onPrimaryAction,
  onSecondaryAction,
  onCallToAction,
  getNextWhatsappUrl,
}) => {
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
          <TestimonialsSection />
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
