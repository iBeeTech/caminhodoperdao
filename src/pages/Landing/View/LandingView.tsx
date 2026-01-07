import React, { ChangeEvent, FormEvent, RefObject } from "react";
import { Header } from "../../../components";
import assis from "../../../assets/assis.png";
import { AvailabilityState, LandingContent, LandingPhase, LandingTone } from "../Model";
import {
  CtaSection,
  FeaturesSection,
  FooterSection,
  HeroSection,
  HistorySection,
  ScheduleSection,
  SignupSection,
  TestimonialsSection,
} from "./components";
import { LandingPage } from "./LandingView.styles";

interface LandingViewProps {
  content: LandingContent;
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
  refs: {
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
  };
  onCheckStatus: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitRegistration: (event: FormEvent<HTMLFormElement>) => void;
  onPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCepChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onCallToAction: () => void;
  onReopenRegistration: () => void;
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
  capacityCallout,
  isCheckingStatus,
  isSubmittingRegistration,
  isSleepLocked,
  refs,
  onCheckStatus,
  onSubmitRegistration,
  onPhoneChange,
  onCepChange,
  onPrimaryAction,
  onSecondaryAction,
  onCallToAction,
  onReopenRegistration,
}) => {
  return (
    <LandingPage>
      <Header />

      <HeroSection
        hero={content.hero}
        heroImage={assis}
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
      />

      <SignupSection
        availability={availability}
        phase={phase}
        errors={errors}
        statusMessage={statusMessage}
        statusTone={statusTone}
        currentStatus={currentStatus}
        qrCodeText={qrCodeText}
        capacityCallout={capacityCallout}
        isCheckingStatus={isCheckingStatus}
        isSubmittingRegistration={isSubmittingRegistration}
        isSleepLocked={isSleepLocked}
        refs={refs}
        onCheckStatus={onCheckStatus}
        onSubmitRegistration={onSubmitRegistration}
        onPhoneChange={onPhoneChange}
        onCepChange={onCepChange}
        onReopenRegistration={onReopenRegistration}
      />

      <ScheduleSection />

      <HistorySection />

      <FeaturesSection features={content.features} />

      <TestimonialsSection testimonials={content.testimonials} />

      <CtaSection callToAction={content.callToAction} onCallToAction={onCallToAction} />

      <FooterSection />
    </LandingPage>
  );
};

export default LandingView;
