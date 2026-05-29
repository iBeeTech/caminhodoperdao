import React, { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { landingService } from "../../../services/landing/landing.service";
import { HttpError } from "../../../services/http/client";
import { useAnalytics } from "../../../hooks/useAnalytics";
import LandingView from "../View/LandingView";
import { AvailabilityState, FeatureSection, LandingContent, LandingPhase, LandingTone } from "../Model";
import { RegistrationPayload, RegistrationStatusResponse } from "../../../services/landing/landing.types";

// Utils imports
import { formatPhoneBR } from "../../../utils/formatters/phone";
import { formatCepBR } from "../../../utils/formatters/cep";
import { getFieldValue, focusFirstError } from "../../../utils/dom/forms";
import { featureIconMap } from "../../../utils/landing/featureIcons";
import { validateCheckForm, validateRegistrationForm } from "../../../utils/landing/validation";
import { syncFormWithStatus } from "../../../utils/landing/syncFormWithStatus";
import { useAddressByCep } from "../../../hooks/useAddressByCep";
import type { FieldRefsType } from "../../../utils/landing/types";
import { identifyRegisteredUser } from "../../../utils/analytics/identity";
import { isEmailValid } from "../../../utils/validators/email";

const DEFAULT_WA_NUMBER = "5516982221415";
const DEFAULT_WA_MESSAGE = "Olá! Vim pelo site e preciso de ajuda.";
const DEPOIMENTO_MESSAGE =
  "Olá! Gostaria de deixar meu depoimento sobre o Caminho do Perdão.";

const getNextWhatsappUrl = async (opts?: { depoimento?: boolean }) => {
  const message = opts?.depoimento ? DEPOIMENTO_MESSAGE : DEFAULT_WA_MESSAGE;
  try {
    const response = await fetch(
      `/api/whatsapp/next?message=${encodeURIComponent(message)}`
    );
    if (response.ok) {
      const data = (await response.json()) as { waUrl?: string };
      if (data.waUrl) {
        return data.waUrl;
      }
    }
  } catch {
    // fallback below
  }

  return `https://api.whatsapp.com/send/?phone=${DEFAULT_WA_NUMBER}&text=${encodeURIComponent(
    message
  )}&type=phone_number&app_absent=0`;
};

const LandingController: React.FC = () => {
  const { t } = useTranslation("landing");
  const { pageViewed, formSubmitted, formError, enrollmentReserved, paymentConfirmed } = useAnalytics();
  const { fetchAddress } = useAddressByCep();

  const landingContent: LandingContent = useMemo(() => {
    const featuresWithoutIcon = t("features.items", { returnObjects: true }) as Array<Omit<FeatureSection, "icon">>;

    return {
      hero: {
        title: t("hero.title"),
        subtitle: t("hero.subtitle"),
        description: t("hero.description"),
        primaryButtonText: t("hero.primaryButton"),
        secondaryButtonText: t("hero.secondaryButton"),
      },
      features: featuresWithoutIcon.map((feature) => ({
        ...feature,
        icon: featureIconMap[feature.id] ?? "",
      })),
      callToAction: {
        title: t("cta.title"),
        description: t("cta.description"),
        buttonText: t("cta.button"),
        buttonAction: "signup",
      },
    };
  }, [t]);

  const [phase, setPhase] = useState<LandingPhase>("intent");
  // Intenção escolhida no seletor: "register" (Quero me inscrever) faz o pré-check
  // de CPF e bloqueia quem já tem inscrição ativa; "check" (Já me inscrevi) mostra o status.
  const [intent, setIntent] = useState<"register" | "check">("check");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<LandingTone>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [capacityCallout, setCapacityCallout] = useState<string | null>(null);
  const [statusPollingCpf, setStatusPollingCpf] = useState<string | null>(null);

  const existingDataRef = useRef<RegistrationStatusResponse | null>(null);
  const pageViewTrackedRef = useRef(false);

  // -------- Helpers (robustos: não dependem de instanceof) --------
  const getHttpInfo = (err: any) => {
    const status =
      err?.status ??
      err?.response?.status ??
      err?.response?.statusCode ??
      err?.data?.status;

    const body =
      err?.response?.body ??
      err?.response?.data ??
      err?.body ??
      err?.data;

    return { status, body };
  };

  const clearFieldErrors = (...fields: string[]) => {
    if (fields.length === 0) return;

    setErrors((prev) => {
      let changed = false;
      const nextErrors = { ...prev };

      fields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(nextErrors, field)) {
          delete nextErrors[field];
          changed = true;
        }
      });

      return changed ? nextErrors : prev;
    });
  };

  const clearEmailError = () => {
    clearFieldErrors("email");
  };

  const clearCpfError = () => {
    clearFieldErrors("cpf");
  };

  const clearTermsError = () => {
    clearFieldErrors("termsAccepted");
  };

  const clearPhoneError = () => {
    clearFieldErrors("phone");
  };

  const clearEmergencyContactNameError = () => {
    clearFieldErrors("emergencyContactName");
  };

  const clearEmergencyContactPhoneError = () => {
    clearFieldErrors("emergencyContactPhone");
  };
  // ---------------------------------------------------------------

  // Limpar sessionStorage ao fazer reload ou sair da página
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("landing_registration_name");
        sessionStorage.removeItem("landing_registration_email");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Rastrear page view ao montar (SSR-safe)
  React.useEffect(() => {
    if (!pageViewTrackedRef.current && typeof window !== "undefined") {
      pageViewed("landing", "/");
      pageViewTrackedRef.current = true;
    }
  }, [pageViewed]);

  React.useEffect(() => {
    const shouldPoll = phase === "status" && currentStatus === "PENDING" && Boolean(statusPollingCpf);
    if (!shouldPoll || !statusPollingCpf) {
      return;
    }

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const result = await landingService.checkStatus(statusPollingCpf);
        if (cancelled || !result?.exists) {
          return;
        }

        if (result.name && typeof window !== "undefined") {
          sessionStorage.setItem("landing_registration_name", result.name);
        }
        if (result.email && typeof window !== "undefined") {
          sessionStorage.setItem("landing_registration_email", result.email);
        }

        const normalizedStatus = result.status ?? (result.expired ? "CANCELED" : null);
        if (!normalizedStatus) {
          return;
        }

        if (normalizedStatus === "PAID") {
          setCurrentStatus("PAID");
          setQrCodeText(result.qrCodeText ?? null);
          setQrCodeImageUrl(result.qrCodeImageUrl ?? null);
          setStatusMessage(result.message ?? t("signup.status.paid"));
          setStatusTone("success");
          paymentConfirmed("landing", "woovi", "pix", { status: "PAID" });
          return;
        }

        if (normalizedStatus === "CANCELED") {
          setCurrentStatus("CANCELED");
          setQrCodeText(result.qrCodeText ?? null);
          setQrCodeImageUrl(result.qrCodeImageUrl ?? null);
          setStatusMessage(t("signup.status.canceled"));
          setStatusTone("error");
          return;
        }

        setCurrentStatus("PENDING");
        setQrCodeText(result.qrCodeText ?? null);
        setQrCodeImageUrl(result.qrCodeImageUrl ?? null);
      } catch {
        // Mantém a UI atual; o usuário ainda pode recarregar manualmente.
      }
    };

    pollStatus();
    const intervalId = window.setInterval(pollStatus, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [phase, currentStatus, statusPollingCpf, t, paymentConfirmed]);

  // Restaurar dados persistidos quando transicionar para form
  React.useEffect(() => {
    if (phase === "form" && typeof window !== "undefined") {
      const savedName = localStorage.getItem("landing_form_name");
      const savedCpf = localStorage.getItem("landing_form_cpf");
      const savedEmail = localStorage.getItem("landing_form_email");

      if (savedName && nameRef.current) {
        nameRef.current.value = savedName;
      }
      if (savedCpf && cpfRef.current) {
        cpfRef.current.value = savedCpf;
      }
      if (savedEmail && emailRef.current) {
        emailRef.current.value = savedEmail;
      }

      localStorage.removeItem("landing_form_name");
      localStorage.removeItem("landing_form_cpf");
      localStorage.removeItem("landing_form_email");
    }
  }, [phase]);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const cpfRef = useRef<HTMLInputElement>(null);
  const dateOfBirthRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const cepRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const complementRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const sleepAtMonasteryRef = useRef<HTMLSelectElement>(null);
  const termsAcceptedRef = useRef<HTMLInputElement>(null);
  const companionRef = useRef<HTMLInputElement>(null);
  const allergyMedicationYesRef = useRef<HTMLInputElement>(null);
  const allergyMedicationNoRef = useRef<HTMLInputElement>(null);
  const allergyMedicationDetailsRef = useRef<HTMLInputElement>(null);
  const dietaryRestrictionYesRef = useRef<HTMLInputElement>(null);
  const dietaryRestrictionNoRef = useRef<HTMLInputElement>(null);
  const dietaryRestrictionDetailsRef = useRef<HTMLInputElement>(null);
  const emergencyContactNameRef = useRef<HTMLInputElement>(null);
  const emergencyContactPhoneRef = useRef<HTMLInputElement>(null);

  const fieldRefs: FieldRefsType = {
    name: nameRef,
    email: emailRef,
    cpf: cpfRef,
    dateOfBirth: dateOfBirthRef,
    phone: phoneRef,
    cep: cepRef,
    address: addressRef,
    number: numberRef,
    complement: complementRef,
    city: cityRef,
    state: stateRef,
    sleepAtMonastery: sleepAtMonasteryRef,
    termsAccepted: termsAcceptedRef,
    companionRef: companionRef,
    allergyMedicationYes: allergyMedicationYesRef,
    allergyMedicationNo: allergyMedicationNoRef,
    allergyMedication: allergyMedicationYesRef,
    allergyMedicationDetails: allergyMedicationDetailsRef,
    dietaryRestrictionYes: dietaryRestrictionYesRef,
    dietaryRestrictionNo: dietaryRestrictionNoRef,
    dietaryRestriction: dietaryRestrictionYesRef,
    dietaryRestrictionDetails: dietaryRestrictionDetailsRef,
    emergencyContactName: emergencyContactNameRef,
    emergencyContactPhone: emergencyContactPhoneRef,
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
    mutationFn: (params: { cpf: string; name?: string }) => landingService.checkStatus(params.cpf, params.name),
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegistrationPayload) => landingService.register(payload),
  });

  const resetStatusState = () => {
    setStatusMessage(null);
    setStatusTone(null);
    setQrCodeText(null);
    setQrCodeImageUrl(null);
    setCurrentStatus(null);
  };

  const scrollToPhoneError = () => {
    setTimeout(() => {
      const input = phoneRef.current;
      if (!input) return;

      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus({ preventScroll: true });
    }, 0);
  };

  const onEmailBlur = () => {
    if (phase !== "form") return;

    const email = getFieldValue(emailRef.current);
    if (email && !isEmailValid(email)) {
      setErrors((prev) => ({ ...prev, email: t("signup.errors.emailInvalid") }));
      return;
    }

    clearEmailError();
  };

  const onEmailChange = (value: string) => {
    const email = value.trim();

    setErrors((prev) => {
      if (!prev.email) {
        return prev;
      }

      if (email && !isEmailValid(email)) {
        return { ...prev, email: t("signup.errors.emailInvalid") };
      }

      const { email: _emailError, ...rest } = prev;
      return rest;
    });
  };

  const onPhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const cursorPos = input.selectionStart ?? 0;
    const previousValue = input.value;
    const newValue = event.target.value;

    const isBackspace = previousValue.length > newValue.length;

    const previousDigits = previousValue.replace(/\D/g, "");
    const newDigits = newValue.replace(/\D/g, "");

    let cleanDigits = newDigits;
    let newCursorPos = cursorPos;

    if (isBackspace) {
      const deletedDigitCount = previousDigits.length - newDigits.length;
      if (deletedDigitCount > 0) {
        const charBeforeCursor = previousValue[cursorPos - 1];
        if (charBeforeCursor && /[^\d]/.test(charBeforeCursor)) {
          newCursorPos = Math.max(0, cursorPos - 1);
        }
      }
    } else {
      const digitsAdded = newDigits.length - previousDigits.length;
      if (digitsAdded > 0) {
        cleanDigits = newDigits.slice(0, 11);
      }
      newCursorPos = cursorPos + (newValue.length - previousValue.length);
    }

    const formatted = formatPhoneBR(cleanDigits);
    input.value = formatted;

    if (!isBackspace && formatted.length > 0) {
      newCursorPos = formatted.length;
      for (let i = formatted.length - 1; i >= 0; i--) {
        if (/\d/.test(formatted[i])) {
          newCursorPos = i + 1;
          break;
        }
      }
    }

    newCursorPos = Math.max(0, Math.min(newCursorPos, formatted.length));

    setTimeout(() => {
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const onCepChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const masked = formatCepBR(event.target.value);
    event.target.value = masked;
    clearFieldErrors("cep");

    if (masked.replace(/\D/g, "").length === 8) {
      const address = await fetchAddress(masked);
      if (address) {
        const fullAddress = address.neighborhood ? `${address.street}, ${address.neighborhood}` : address.street;

        if (addressRef.current) addressRef.current.value = fullAddress;
        if (cityRef.current) cityRef.current.value = address.city;
        if (stateRef.current) stateRef.current.value = address.state;
        clearFieldErrors("address", "city", "state");
      }
    }
  };

  const handleCheckStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetStatusState();

    const validationErrors = validateCheckForm(t, { cpf: cpfRef }).errors;

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstError(validationErrors, fieldRefs);
      Object.entries(validationErrors).forEach(([field, errorMsg]) => {
        formError("landing", "signup_check", errorMsg, field);
      });
      return;
    }

    setErrors({}); // limpa erros anteriores quando a validação passa (ex.: CPF corrigido)
    const cpf = getFieldValue(cpfRef.current);
    const normalizedCpf = cpf.replace(/\D/g, "");
    setStatusPollingCpf(normalizedCpf || null);
    formSubmitted("landing", "signup_check", "pending");

    try {
      const result = await checkStatusMutation.mutateAsync({ cpf });
      existingDataRef.current = result;

      if (!result.exists) {
        const currentName = getFieldValue(nameRef.current);
        localStorage.setItem("landing_form_name", currentName);
        localStorage.setItem("landing_form_cpf", cpf);
        setPhase("form");
        return;
      }

      syncFormWithStatus(result, fieldRefs);

      if (result.name) sessionStorage.setItem("landing_registration_name", result.name);
      if (result.email) sessionStorage.setItem("landing_registration_email", result.email);

      const normalizedStatus = result.status ?? (result.expired ? "CANCELED" : null);
      setCurrentStatus(normalizedStatus);
      setQrCodeText(result.qrCodeText ?? null);
      setQrCodeImageUrl(result.qrCodeImageUrl ?? null);

      // Define a mensagem de status (usada ao exibir o status).
      if (normalizedStatus === "PAID") {
        setStatusMessage(result.message ?? t("signup.status.paid"));
        setStatusTone("success");
        paymentConfirmed("landing", "woovi", "pix", { status: "PAID" });
      } else if (result.expired || normalizedStatus === "CANCELED") {
        setStatusMessage(t("signup.status.canceled"));
        setStatusTone("error");
      } else if (normalizedStatus === "PENDING") {
        setStatusMessage(t("signup.status.pending"));
        setStatusTone("warn");
      }

      const hasActiveRegistration =
        normalizedStatus === "PAID" || normalizedStatus === "PENDING";

      // Fluxo "Quero me inscrever": se já há inscrição ativa, bloqueia com callout;
      // se a anterior expirou/cancelou, permite refazer a inscrição.
      if (intent === "register") {
        if (hasActiveRegistration) {
          setPhase("alreadyRegistered");
        } else {
          const currentName = getFieldValue(nameRef.current);
          localStorage.setItem("landing_form_name", currentName);
          localStorage.setItem("landing_form_cpf", cpf);
          setPhase("form");
        }
        return;
      }

      // Fluxo "Já me inscrevi": mostra o status (ou abre o formulário se não houver).
      if (hasActiveRegistration || result.expired || normalizedStatus === "CANCELED") {
        setPhase("status");
      } else {
        setPhase("form");
      }
    } catch (error: any) {
      // Robusto (não depende de instanceof)
      const { status, body } = getHttpInfo(error);

      if (status === 400 && body?.error === "invalid_cpf") {
        setErrors((prev) => ({ ...prev, cpf: t("signup.errors.cpfInvalid") }));
        setStatusMessage(null);
        setStatusTone(null);
        return;
      }

      setStatusMessage(t("signup.status.checkError"));
      setStatusTone("error");
      formError("landing", "signup_check", "check_status_error");
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetStatusState();
    setErrors({});

    if (availability.totalFull && !existingDataRef.current?.exists) {
      setCapacityCallout(t("signup.callouts.capacityFull"));
      formError("landing", "signup_check", "capacity_full");
      return;
    }

    const validationResult = validateRegistrationForm(t, fieldRefs, {
      isMonasterySlotUnavailable,
      monasteryFull: availability.monasteryFull,
      alreadySleeper: existingDataRef.current?.sleep_at_monastery === 1,
    });

    const validationErrors = validationResult.errors;

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatusMessage(t("signup.status.validationError"));
      setStatusTone("error");
      Object.entries(validationErrors).forEach(([field, errorMsg]) => {
        formError("landing", "signup_registration", errorMsg, field);
      });
      focusFirstError(validationErrors, fieldRefs);
      return;
    }

    const payload: RegistrationPayload = {
      name: getFieldValue(nameRef?.current ?? null),
      email: getFieldValue(emailRef?.current ?? null),
      cpf: getFieldValue(cpfRef?.current ?? null).replace(/\D/g, ""),
      dateOfBirth: getFieldValue(dateOfBirthRef?.current ?? null),
      phone: getFieldValue(phoneRef?.current ?? null),
      cep: getFieldValue(cepRef?.current ?? null),
      address: getFieldValue(addressRef?.current ?? null),
      number: getFieldValue(numberRef?.current ?? null),
      complement: getFieldValue(complementRef?.current ?? null),
      city: getFieldValue(cityRef?.current ?? null),
      state: (getFieldValue(stateRef?.current ?? null) || "").toUpperCase(),
      sleepAtMonastery: isMonasterySlotUnavailable ? false : (sleepAtMonasteryRef?.current?.value ?? "") === "yes",
      companionName: getFieldValue(fieldRefs.companionRef?.current ?? null),
      termsAccepted: fieldRefs.termsAccepted?.current?.checked === true,
      hasAllergyMedication: fieldRefs.allergyMedicationYes?.current?.checked === true,
      allergyMedicationDetails:
        fieldRefs.allergyMedicationYes?.current?.checked === true
          ? getFieldValue(fieldRefs.allergyMedicationDetails?.current ?? null)
          : "",
      hasDietaryRestriction: fieldRefs.dietaryRestrictionYes?.current?.checked === true,
      dietaryRestrictionDetails:
        fieldRefs.dietaryRestrictionYes?.current?.checked === true
          ? getFieldValue(fieldRefs.dietaryRestrictionDetails?.current ?? null)
          : "",
      emergencyContactName: getFieldValue(fieldRefs.emergencyContactName?.current ?? null),
      emergencyContactPhone: getFieldValue(fieldRefs.emergencyContactPhone?.current ?? null),
    };

    try {
      const data = await registerMutation.mutateAsync(payload);
      setStatusPollingCpf(payload.cpf || null);

      setCurrentStatus(data.status ?? null);
      setQrCodeText(data.qrCodeText ?? null);
      setQrCodeImageUrl(data.qrCodeImageUrl ?? null);
      setStatusMessage(data.message ?? t("signup.status.waitingPayment"));
      setStatusTone("warn");
      setPhase("status");

      if (typeof window !== "undefined") {
        sessionStorage.setItem("landing_registration_name", payload.name);
        sessionStorage.setItem("landing_registration_email", payload.email);
      }

      enrollmentReserved("landing", "woovi", { status: data.status });

      if (data.registration_id) {
        identifyRegisteredUser(data.registration_id);
      }

      setTimeout(() => {
        document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (error: any) {
      const { status, body } = getHttpInfo(error);
      const bodyAsText = JSON.stringify(body ?? {}).toLowerCase();

      if (status === 409 && body?.error === "registration_exists") {
        setStatusMessage(t("signup.callouts.registrationExists"));
        setStatusTone("warn");
        setPhase("form");
        return;
      }

      if (status === 409 && body?.error === "cpf_already_registered") {
        setStatusMessage(t("signup.callouts.cpfAlreadyRegistered"));
        setStatusTone("error");
        setErrors((prev) => ({ ...prev, cpf: t("signup.callouts.cpfAlreadyRegistered") }));
        return;
      }

      if (status === 409 && (body?.error === "phone_used_by_other_name" || bodyAsText.includes("phone_used_by_other_name"))) {
        setStatusMessage(null);
        setStatusTone(null);
        setErrors((prev) => ({ ...prev, phone: t("signup.errors.phoneUsedByOtherName") }));
        scrollToPhoneError();
        return;
      }

      if (status === 400 && body?.error === "terms_required") {
        setErrors((prev) => ({ ...prev, termsAccepted: t("signup.errors.termsRequired") }));
        setPhase("form");
        return;
      }

      if (status === 400 && body?.error === "emergency_contact_name_required") {
        setErrors((prev) => ({ ...prev, emergencyContactName: t("signup.errors.emergencyContactNameRequired") }));
        setPhase("form");
        return;
      }

      if (status === 400 && body?.error === "emergency_contact_phone_invalid") {
        setErrors((prev) => ({ ...prev, emergencyContactPhone: t("signup.errors.emergencyContactPhoneInvalid") }));
        setPhase("form");
        return;
      }

      if (status === 400 && body?.error === "emergency_contact_phone_same_as_registration_phone") {
        setErrors((prev) => ({ ...prev, emergencyContactPhone: t("signup.errors.emergencyContactPhoneSameAsRegistration") }));
        setPhase("form");
        return;
      }

      if (status === 400 && body?.error === "allergy_medication_required") {
        setErrors((prev) => ({ ...prev, allergyMedication: t("signup.errors.allergyMedicationRequired") }));
        setPhase("form");
        return;
      }

      if (status === 400 && body?.error === "allergy_medication_details_required") {
        setErrors((prev) => ({ ...prev, allergyMedicationDetails: t("signup.errors.allergyMedicationDetailsRequired") }));
        setPhase("form");
        return;
      }

      if (status === 400 && body?.error === "dietary_restriction_required") {
        setErrors((prev) => ({ ...prev, dietaryRestriction: t("signup.errors.dietaryRestrictionRequired") }));
        setPhase("form");
        return;
      }

      if (status === 400 && body?.error === "dietary_restriction_details_required") {
        setErrors((prev) => ({ ...prev, dietaryRestrictionDetails: t("signup.errors.dietaryRestrictionDetailsRequired") }));
        setPhase("form");
        return;
      }

      // fallback (se HttpError funcionar)
      if (error instanceof HttpError && error.status === 409) {
        const errorData = error.response?.body as any;
        if (errorData?.error === "phone_used_by_other_name") {
          setStatusMessage(null);
          setStatusTone(null);
          setErrors((prev) => ({ ...prev, phone: t("signup.errors.phoneUsedByOtherName") }));
          scrollToPhoneError();
          return;
        }

        try {
          const statusData = await landingService.checkStatus(payload.cpf);

          if (!statusData?.exists) {
            setStatusMessage(t("signup.status.processingError"));
            setStatusTone("error");
            setPhase("form");
            return;
          }

          existingDataRef.current = statusData;
          syncFormWithStatus(statusData, fieldRefs);

          if (statusData.name) sessionStorage.setItem("landing_registration_name", statusData.name);
          if (statusData.email) sessionStorage.setItem("landing_registration_email", statusData.email);

          const normalizedStatus = statusData.status ?? (statusData.expired ? "CANCELED" : null);
          setCurrentStatus(normalizedStatus);
          setQrCodeText(statusData.qrCodeText ?? null);
          setQrCodeImageUrl(statusData.qrCodeImageUrl ?? null);

          if (normalizedStatus === "PAID") {
            setStatusMessage(t("signup.status.paid"));
            setStatusTone("success");
            paymentConfirmed("landing", "woovi", "pix", { status: "PAID" });
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

          setTimeout(() => {
            document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        } catch (statusError) {
          setStatusMessage(t("signup.status.processingError"));
          setStatusTone("error");
        }
        return;
      }

      // Erro específico de criação de PIX
      if (error instanceof HttpError && error.status === 500) {
        const errorData = error.response?.body as any;
        if (errorData?.error === "payment_provider_not_configured") {
          setStatusMessage(
            t("signup.status.paymentConfigError") ||
              "Erro de configuração de pagamento. Por favor, contate o administrador."
          );
          setStatusTone("error");
          return;
        }
        if (errorData?.error === "pix_creation_failed") {
          setStatusMessage(t("signup.status.pixError"));
          setStatusTone("error");
          return;
        }
      }

      setStatusMessage(t("signup.status.processingError"));
      setStatusTone("error");
    }
  };

  const handleReopenRegistration = async () => {
    setCapacityCallout(null);
    resetStatusState();
    setStatusPollingCpf(null);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("landing_registration_name");
      sessionStorage.removeItem("landing_registration_email");
    }

    try {
      const result = await refetchAvailability();
      const data = result.data;
      if (data?.totalFull) {
        setCapacityCallout(t("signup.callouts.capacityFull"));
        return;
      }
      setPhase("check");
    } catch (error) {
      setStatusMessage(t("signup.status.reopenError"));
      setStatusTone("error");
    }
  };

  const handleStartNewRegistration = () => {
    setCapacityCallout(null);
    resetStatusState();
    setErrors({});
    setStatusPollingCpf(null);
    existingDataRef.current = null;
    setPhase("check");
  };

  // Seletor de intenção: "Quero me inscrever" abre o mini-form (Nome + CPF) para
  // validar o CPF antes do formulário completo; "Já me inscrevi" abre a conferência.
  const handleChooseRegister = () => {
    setCapacityCallout(null);
    resetStatusState();
    setErrors({});
    setStatusPollingCpf(null);
    existingDataRef.current = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("landing_form_name");
      localStorage.removeItem("landing_form_cpf");
      localStorage.removeItem("landing_form_email");
    }
    setIntent("register");
    setPhase("check");
  };

  const handleChooseCheck = () => {
    setCapacityCallout(null);
    resetStatusState();
    setErrors({});
    setIntent("check");
    setPhase("check");
  };

  const handleBackToIntent = () => {
    resetStatusState();
    setErrors({});
    setStatusPollingCpf(null);
    setPhase("intent");
  };

  // No callout "você já está inscrito", leva o usuário ao status da inscrição
  // (dados já carregados pelo pré-check).
  const handleViewMyRegistration = () => {
    setIntent("check");
    setPhase("status");
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
      qrCodeImageUrl={qrCodeImageUrl}
      capacityCallout={capacityCallout}
      isCheckingStatus={checkStatusMutation.isPending}
      isSubmittingRegistration={registerMutation.isPending}
      isSleepLocked={isMonasterySlotUnavailable}
      refs={{
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
        emergencyContactNameRef,
        emergencyContactPhoneRef,
        allergyMedicationYesRef,
        allergyMedicationNoRef,
        allergyMedicationDetailsRef,
        dietaryRestrictionYesRef,
        dietaryRestrictionNoRef,
        dietaryRestrictionDetailsRef,
      }}
      onCheckStatus={handleCheckStatus}
      onSubmitRegistration={handleRegister}
      onPhoneChange={onPhoneChange}
      onCepChange={onCepChange}
      onEmailBlur={onEmailBlur}
      onEmailChange={onEmailChange}
      onClearFieldError={(field) => clearFieldErrors(field)}
      onPrimaryAction={() => {
        document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth" });
      }}
      onSecondaryAction={() => {
        document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
      }}
      onCallToAction={() => {
        document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth" });
      }}
      onReopenRegistration={handleReopenRegistration}
      onNewRegistration={handleStartNewRegistration}
      onChooseRegister={handleChooseRegister}
      onChooseCheck={handleChooseCheck}
      onBackToIntent={handleBackToIntent}
      registerIntent={intent === "register"}
      onViewMyRegistration={handleViewMyRegistration}
      getNextWhatsappUrl={getNextWhatsappUrl}
      onCpfChange={clearCpfError}
      onPhoneChangeError={clearPhoneError}
      onTermsChange={clearTermsError}
      onEmergencyContactNameChange={clearEmergencyContactNameError}
      onEmergencyContactPhoneChange={clearEmergencyContactPhoneError}
    />
  );
};

export default LandingController;
