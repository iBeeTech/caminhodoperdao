import React, { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import peaceIcon from "../../../assets/pombo-white.png";
import growIcon from "../../../assets/grow.png";
import heartIcon from "../../../assets/heart.png";
import starIcon from "../../../assets/star.png";
import { landingService } from "../../../services/landing/landing.service";
import { HttpError } from "../../../services/http/client";
import { useAnalytics } from "../../../hooks/useAnalytics";
import LandingView from "../View/LandingView";
import { AvailabilityState, FeatureSection, LandingContent, LandingPhase, LandingTone, Testimonial } from "../Model";
import { RegistrationPayload, RegistrationStatusResponse } from "../../../services/landing/landing.types";

const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const featureIconMap: Record<string, string> = {
  "1": peaceIcon,
  "2": growIcon,
  "3": heartIcon,
  "4": starIcon,
};

const formatPhoneDigits = (digits: string) => {
  const sanitized = digits.replace(/\D/g, "").slice(0, 11);
  if (!sanitized) return "";

  if (sanitized.length <= 2) {
    return `(${sanitized}${sanitized.length === 2 ? ")" : ""}`;
  }

  const ddd = sanitized.slice(0, 2);
  const body = sanitized.slice(2);
  const first = body.slice(0, 1);
  const rest = body.slice(1);

  let out = `(${ddd})`;
  if (first) out += ` ${first}`;

  if (rest.length <= 4) {
    out += rest;
  } else {
    out += `${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }

  return out;
};

const maskCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  const match = digits.match(/(\d{0,2})(\d{0,3})(\d{0,3})/);
  if (!match) return "";
  const [, p1, p2, p3] = match;
  let out = "";
  if (p1) out += p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `-${p3}`;
  return out;
};

const getFieldValue = (input: HTMLInputElement | null) => input?.value.trim() ?? "";

const LandingController: React.FC = () => {
  const { t, i18n } = useTranslation("landing");
  const { trackPageView, trackSignupSubmitted, trackSignupSuccess, trackSignupError, trackCtaHeroClick } = useAnalytics();

  const landingContent: LandingContent = useMemo(() => {
    const featuresWithoutIcon = t("features.items", { returnObjects: true }) as Array<Omit<FeatureSection, "icon">>;
    const testimonials = t("testimonials.items", { returnObjects: true }) as Testimonial[];

    return {
      hero: {
        title: t("hero.title"),
        subtitle: t("hero.subtitle"),
        description: t("hero.description"),
        primaryButtonText: t("hero.primaryButton"),
        secondaryButtonText: t("hero.secondaryButton"),
      },
      features: featuresWithoutIcon.map(feature => ({
        ...feature,
        icon: featureIconMap[feature.id] ?? "",
      })),
      testimonials,
      callToAction: {
        title: t("cta.title"),
        description: t("cta.description"),
        buttonText: t("cta.button"),
        buttonAction: "signup",
      },
    };
  }, [i18n.language, t]);

  const [phase, setPhase] = useState<LandingPhase>("check");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<LandingTone>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [capacityCallout, setCapacityCallout] = useState<string | null>(null);

  const existingDataRef = useRef<RegistrationStatusResponse | null>(null);
  const pageViewTrackedRef = useRef(false);

  // Rastrear page view ao montar (SSR-safe)
  React.useEffect(() => {
    if (!pageViewTrackedRef.current && typeof window !== "undefined") {
      trackPageView("Landing", "/");
      pageViewTrackedRef.current = true;
    }
  }, [trackPageView]);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const cepRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const complementRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const sleepAtMonasteryRef = useRef<HTMLSelectElement>(null);

  const fieldRefs: Record<string, React.RefObject<HTMLElement | null>> = {
    name: nameRef,
    email: emailRef,
    phone: phoneRef,
    cep: cepRef,
    address: addressRef,
    number: numberRef,
    complement: complementRef,
    city: cityRef,
    state: stateRef,
    sleepAtMonastery: sleepAtMonasteryRef,
  };

  const focusFirstError = (errorMap: Record<string, string>) => {
    const firstKey = Object.keys(errorMap).find(key => fieldRefs[key]);
    if (!firstKey) return;
    const element = fieldRefs[firstKey]?.current;
    if (element) {
      element.focus();
    }
  };

  const {
    data: availabilityData,
    isLoading: isAvailabilityLoading,
    error: availabilityError,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: ["landingAvailability"],
    queryFn: () => landingService.getAvailability(),
    staleTime: 60 * 1000,
  });

  const availability: AvailabilityState = useMemo(
    () => ({
      loading: isAvailabilityLoading,
      error: availabilityError ? t("availability.error") : "",
      totalFull: availabilityData?.totalFull ?? false,
      monasteryFull: availabilityData?.monasteryFull ?? false,
    }),
    [availabilityData, availabilityError, isAvailabilityLoading, t]
  );

  const isMonasterySlotUnavailable = availability.monasteryFull && existingDataRef.current?.sleep_at_monastery !== 1;

  const checkStatusMutation = useMutation({
    mutationFn: (email: string) => landingService.checkStatus(email),
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegistrationPayload) => landingService.register(payload),
  });

  const syncFormWithStatus = (data: RegistrationStatusResponse) => {
    const assign = (ref: React.RefObject<HTMLInputElement | null>, value?: string | null) => {
      if (ref.current) ref.current.value = value ?? "";
    };

    assign(nameRef, data.name ?? "");
    assign(emailRef, data.email ?? "");
    assign(phoneRef, data.phone ? formatPhoneDigits(data.phone) : "");
    assign(cepRef, data.cep ? maskCep(data.cep) : "");
    assign(addressRef, data.address ?? "");
    assign(numberRef, data.number ?? "");
    assign(complementRef, data.complement ?? "");
    assign(cityRef, data.city ?? "");
    assign(stateRef, data.state ?? "");

    if (sleepAtMonasteryRef.current) {
      sleepAtMonasteryRef.current.value = data.sleep_at_monastery === 1 ? "yes" : data.sleep_at_monastery === 0 ? "no" : "";
    }
  };

  const resetStatusState = () => {
    setStatusMessage(null);
    setStatusTone(null);
    setQrCodeText(null);
    setCurrentStatus(null);
  };

  const onPhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneDigits(event.target.value);
    event.target.value = formatted;
  };

  const onCepChange = (event: ChangeEvent<HTMLInputElement>) => {
    const masked = maskCep(event.target.value);
    event.target.value = masked;
  };

  const validateCheckForm = () => {
    const newErrors: Record<string, string> = {};
    const name = getFieldValue(nameRef.current);
    const email = getFieldValue(emailRef.current);

    if (!name) newErrors.name = t("signup.errors.required");
    if (!email) newErrors.email = t("signup.errors.required");
    else if (!emailRegex.test(email)) newErrors.email = t("signup.errors.emailInvalid");

    return newErrors;
  };

  const validateRegistrationForm = () => {
    const newErrors: Record<string, string> = {};
    const phoneDigits = getFieldValue(phoneRef.current).replace(/\D/g, "");
    const cepDigits = getFieldValue(cepRef.current).replace(/\D/g, "");

    const requiredFields: Array<{ key: string; value: string; message: string; validator?: (value: string) => boolean }> = [
      { key: "name", value: getFieldValue(nameRef.current), message: t("signup.errors.required") },
      {
        key: "email",
        value: getFieldValue(emailRef.current),
        message: t("signup.errors.emailInvalid"),
        validator: value => emailRegex.test(value),
      },
      { key: "phone", value: phoneDigits, message: t("signup.errors.phoneInvalid"), validator: value => value.length === 11 },
      { key: "cep", value: cepDigits, message: t("signup.errors.cepInvalid"), validator: value => value.length === 8 },
      { key: "address", value: getFieldValue(addressRef.current), message: t("signup.errors.required") },
      { key: "number", value: getFieldValue(numberRef.current), message: t("signup.errors.required") },
      { key: "city", value: getFieldValue(cityRef.current), message: t("signup.errors.required") },
      { key: "state", value: getFieldValue(stateRef.current), message: t("signup.errors.required") },
    ];

    requiredFields.forEach(field => {
      const isValid = field.validator ? field.validator(field.value) : !!field.value;
      if (!isValid) newErrors[field.key] = field.message;
    });

    const sleepSelection = isMonasterySlotUnavailable
      ? "no"
      : sleepAtMonasteryRef.current?.value ?? "";
    if (!sleepSelection) newErrors.sleepAtMonastery = t("signup.errors.sleepRequired");

    const alreadySleeper = existingDataRef.current?.sleep_at_monastery === 1;
    if (
      sleepSelection === "yes" &&
      availability.monasteryFull &&
      !alreadySleeper
    ) {
      newErrors.sleepAtMonastery = t("signup.errors.sleepFull");
    }

    return newErrors;
  };

  const handleCheckStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetStatusState();
    setErrors({});

    const validationErrors = validateCheckForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstError(validationErrors);
      Object.entries(validationErrors).forEach(([field, error]) => {
        trackSignupError(error, field);
      });
      return;
    }

    const email = getFieldValue(emailRef.current);
    trackSignupSubmitted("check", { email });

    try {
      const result = await checkStatusMutation.mutateAsync(email);
      existingDataRef.current = result;

      if (!result.exists) {
        setPhase("form");
        return;
      }

      syncFormWithStatus(result);
      const normalizedStatus = result.status ?? (result.expired ? "CANCELED" : null);
      setCurrentStatus(normalizedStatus);
      setQrCodeText(result.qrCodeText ?? null);

      if (normalizedStatus === "PAID") {
        setStatusMessage(result.message ?? t("signup.status.paid"));
        setStatusTone("success");
        setPhase("status");
        return;
      }

      if (result.expired || normalizedStatus === "CANCELED") {
        setStatusMessage(t("signup.status.canceled"));
        setStatusTone("error");
        setPhase("status");
      } else if (normalizedStatus === "PENDING") {
        setStatusMessage(t("signup.status.pending"));
        setStatusTone("warn");
        setPhase("status");
      } else {
        setPhase("form");
      }
    } catch (error) {
      setStatusMessage(t("signup.status.checkError"));
      setStatusTone("error");
      trackSignupError("check_status_error");
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetStatusState();
    setErrors({});

    if (availability.totalFull && !existingDataRef.current?.exists) {
      setCapacityCallout(t("signup.callouts.capacityFull"));
      trackSignupError("capacity_full");
      return;
    }

    const validationErrors = validateRegistrationForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatusMessage(t("signup.status.validationError"));
      setStatusTone("error");
      Object.entries(validationErrors).forEach(([field, error]) => {
        trackSignupError(error, field);
      });
      focusFirstError(validationErrors);
      return;
    }

    const payload: RegistrationPayload = {
      name: getFieldValue(nameRef.current),
      email: getFieldValue(emailRef.current),
      phone: getFieldValue(phoneRef.current),
      cep: getFieldValue(cepRef.current),
      address: getFieldValue(addressRef.current),
      number: getFieldValue(numberRef.current),
      complement: getFieldValue(complementRef.current),
      city: getFieldValue(cityRef.current),
      state: getFieldValue(stateRef.current).toUpperCase(),
      sleepAtMonastery: isMonasterySlotUnavailable
        ? false
        : (sleepAtMonasteryRef.current?.value ?? "") === "yes",
    };

    try {
      const data = await registerMutation.mutateAsync(payload);
      setCurrentStatus(data.status ?? null);
      setQrCodeText(data.qrCodeText ?? null);
      setStatusMessage(data.message ?? t("signup.status.waitingPayment"));
      setStatusTone("warn");
      setPhase("status");
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        try {
          const statusData = await landingService.checkStatus(payload.email);
          existingDataRef.current = statusData;
          syncFormWithStatus(statusData);
          const normalizedStatus = statusData.status ?? (statusData.expired ? "CANCELED" : null);
          setCurrentStatus(normalizedStatus);
          setQrCodeText(statusData.qrCodeText ?? null);

          if (normalizedStatus === "PAID") {
            setStatusMessage(t("signup.status.paid"));
            setStatusTone("success");
          } else if (normalizedStatus === "PENDING") {
            setStatusMessage(t("signup.status.defaultPending"));
            setStatusTone("warn");
          } else if (normalizedStatus === "CANCELED") {
            setStatusMessage(t("signup.status.canceled"));
            setStatusTone("error");
          } else {
            setStatusMessage(t("signup.status.existing"));
            setStatusTone(null);
          }

          setPhase("status");
        } catch (statusError) {
          setStatusMessage(t("signup.status.processingError"));
          setStatusTone("error");
        }
        return;
      }

      setStatusMessage(t("signup.status.processingError"));
      setStatusTone("error");
    }
  };

  const handleReopenRegistration = async () => {
    setCapacityCallout(null);
    resetStatusState();

    try {
      const result = await refetchAvailability();
      const data = result.data;
      if (data?.totalFull) {
        setCapacityCallout(t("signup.callouts.capacityFull"));
        return;
      }
      setPhase("form");
    } catch (error) {
      setStatusMessage(t("signup.status.reopenError"));
      setStatusTone("error");
    }
  };

  return (
    <LandingView
      content={landingContent}
      availability={availability}
      phase={phase}
      errors={errors}
      statusMessage={statusMessage}
      statusTone={statusTone}
      currentStatus={currentStatus}
      qrCodeText={qrCodeText}
      capacityCallout={capacityCallout}
      isCheckingStatus={checkStatusMutation.isPending}
      isSubmittingRegistration={registerMutation.isPending}
      isSleepLocked={isMonasterySlotUnavailable}
      refs={{
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
      }}
      onCheckStatus={handleCheckStatus}
      onSubmitRegistration={handleRegister}
      onPhoneChange={onPhoneChange}
      onCepChange={onCepChange}
      onPrimaryAction={() => {
        trackCtaHeroClick("primary");
        document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth" });
      }}
      onSecondaryAction={() => {
        trackCtaHeroClick("secondary");
        document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
      }}
      onCallToAction={() => {
        document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth" });
      }}
      onReopenRegistration={handleReopenRegistration}
    />
  );
};

export default LandingController;
