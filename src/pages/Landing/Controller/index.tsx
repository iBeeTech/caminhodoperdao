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

const LandingController: React.FC = () => {
  const { t } = useTranslation("landing");
  const { pageViewed, formSubmitted, formError } = useAnalytics();
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
      features: featuresWithoutIcon.map(feature => ({
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

  const [phase, setPhase] = useState<LandingPhase>("check");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<LandingTone>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [capacityCallout, setCapacityCallout] = useState<string | null>(null);

  const existingDataRef = useRef<RegistrationStatusResponse | null>(null);
  const pageViewTrackedRef = useRef(false);

  // Rastrear page view ao montar (SSR-safe)
  React.useEffect(() => {
    if (!pageViewTrackedRef.current && typeof window !== "undefined") {
      pageViewed("landing", "/");
      pageViewTrackedRef.current = true;
    }
  }, [pageViewed]);

  // Restaurar dados persistidos quando transicionar para form
  React.useEffect(() => {
    if (phase === "form" && typeof window !== "undefined") {
      const savedName = localStorage.getItem("landing_form_name");
      const savedEmail = localStorage.getItem("landing_form_email");

      if (savedName && nameRef.current) {
        nameRef.current.value = savedName;
      }
      if (savedEmail && emailRef.current) {
        emailRef.current.value = savedEmail;
      }

      // Limpar localStorage após usar
      localStorage.removeItem("landing_form_name");
      localStorage.removeItem("landing_form_email");
    }
  }, [phase]);

  // Polling de status quando em modo "status" e status é PENDING
  React.useEffect(() => {
    if (phase !== "status" || currentStatus !== "PENDING" || !existingDataRef.current?.email) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const statusData = await landingService.checkStatus(existingDataRef.current!.email);
        
        // Se o status mudou para PAID, atualizar
        if (statusData.status === "PAID") {
          setCurrentStatus("PAID");
          setStatusMessage(t("signup.status.paid") || "Pagamento confirmado!");
          setStatusTone("success");
          clearInterval(pollInterval);
        }
      } catch (error) {
        // Continuar tentando mesmo com erro
        console.debug("Erro ao fazer polling de status:", error);
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(pollInterval);
  }, [phase, currentStatus, t]);

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

  const fieldRefs: FieldRefsType = {
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

  const resetStatusState = () => {
    setStatusMessage(null);
    setStatusTone(null);
    setQrCodeText(null);
    setQrCodeImageUrl(null);
    setCurrentStatus(null);
  };

  const onPhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const cursorPos = input.selectionStart ?? 0;
    const previousValue = input.value;
    const newValue = event.target.value;
    
    // Detectar se é backspace
    const isBackspace = previousValue.length > newValue.length;
    
    // Extrair apenas dígitos do valor anterior e novo
    const previousDigits = previousValue.replace(/\D/g, "");
    const newDigits = newValue.replace(/\D/g, "");
    
    // Se é backspace, remover um dígito
    let cleanDigits = newDigits;
    let newCursorPos = cursorPos;
    
    if (isBackspace) {
      // Detectar qual dígito foi removido
      const deletedDigitCount = previousDigits.length - newDigits.length;
      if (deletedDigitCount > 0) {
        // Encontrar a posição do dígito deletado e remover os caracteres especiais ao redor
        const charBeforeCursor = previousValue[cursorPos - 1];
        if (charBeforeCursor && /[^\d]/.test(charBeforeCursor)) {
          // Se há caractere especial, mover cursor pra trás dele também
          newCursorPos = Math.max(0, cursorPos - 1);
        }
      }
    } else {
      // Se está digitando (inserindo um dígito)
      const digitsAdded = newDigits.length - previousDigits.length;
      if (digitsAdded > 0) {
        cleanDigits = newDigits.slice(0, 11); // Máximo 11 dígitos
      }
      newCursorPos = cursorPos + (newValue.length - previousValue.length);
    }
    
    // Formatar os dígitos
    const formatted = formatPhoneBR(cleanDigits);
    input.value = formatted;
    
    // Posicionar o cursor logo após o último dígito inserido
    if (!isBackspace && formatted.length > 0) {
      // Encontrar a posição do último dígito + 1
      newCursorPos = formatted.length;
      // Voltar até encontrar o último dígito e posicionar após ele
      for (let i = formatted.length - 1; i >= 0; i--) {
        if (/\d/.test(formatted[i])) {
          newCursorPos = i + 1;
          break;
        }
      }
    }
    
    // Limitar a posição do cursor
    newCursorPos = Math.max(0, Math.min(newCursorPos, formatted.length));
    
    // Usar setTimeout para garantir que o cursor seja posicionado após o render
    setTimeout(() => {
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const onCepChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const masked = formatCepBR(event.target.value);
    event.target.value = masked;

    // Se tem 8 dígitos, buscar endereço
    if (masked.replace(/\D/g, "").length === 8) {
      const address = await fetchAddress(masked);
      if (address) {
        // Preencher campos automaticamente
        // Concatenar endereço + bairro
        const fullAddress = address.neighborhood 
          ? `${address.street}, ${address.neighborhood}`
          : address.street;
        
        if (addressRef.current) addressRef.current.value = fullAddress;
        if (cityRef.current) cityRef.current.value = address.city;
        if (stateRef.current) stateRef.current.value = address.state;
      }
    }
  };

  const handleCheckStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetStatusState();
    setErrors({});

    const validationErrors = validateCheckForm(t, { name: nameRef, email: emailRef }).errors;
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstError(validationErrors, fieldRefs);
      Object.entries(validationErrors).forEach(([field, error]) => {
        formError("landing", "signup_check", error, field);
      });
      return;
    }

    const email = getFieldValue(emailRef.current);
    formSubmitted("landing", "signup_check", "pending");

    try {
      const result = await checkStatusMutation.mutateAsync(email);
      existingDataRef.current = result;

      if (!result.exists) {
        // Persistir nome e email para pré-preenchimento
        const name = getFieldValue(nameRef.current);
        localStorage.setItem("landing_form_name", name);
        localStorage.setItem("landing_form_email", email);
        setPhase("form");
        return;
      }

      syncFormWithStatus(result, fieldRefs);
      const normalizedStatus = result.status ?? (result.expired ? "CANCELED" : null);
      setCurrentStatus(normalizedStatus);
      setQrCodeText(result.qrCodeText ?? null);
      setQrCodeImageUrl(result.qrCodeImageUrl ?? null);

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
      Object.entries(validationErrors).forEach(([field, error]) => {
        formError("landing", "signup_registration", error, field);
      });
      focusFirstError(validationErrors, fieldRefs);
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
      companionName: getFieldValue(fieldRefs.companionRef),
    };

    try {
      const data = await registerMutation.mutateAsync(payload);
      setCurrentStatus(data.status ?? null);
      setQrCodeText(data.qrCodeText ?? null);
      setQrCodeImageUrl(data.qrCodeImageUrl ?? null);
      setStatusMessage(data.message ?? t("signup.status.waitingPayment"));
      setStatusTone("warn");
      setPhase("status");

      if (data.registration_id) {
        identifyRegisteredUser(data.registration_id);
      }

      // Manter usuário na seção de inscrição após submissão bem-sucedida
      setTimeout(() => {
        document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        try {
          const statusData = await landingService.checkStatus(payload.email);
          existingDataRef.current = statusData;
          syncFormWithStatus(statusData, fieldRefs);
          const normalizedStatus = statusData.status ?? (statusData.expired ? "CANCELED" : null);
          setCurrentStatus(normalizedStatus);
          setQrCodeText(statusData.qrCodeText ?? null);
          setQrCodeImageUrl(statusData.qrCodeImageUrl ?? null);

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

          // Manter usuário na seção de inscrição após verificação
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
          setStatusMessage(t("signup.status.paymentConfigError") || "Erro de configuração de pagamento. Por favor, contate o administrador.");
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
        document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth" });
      }}
      onSecondaryAction={() => {
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
