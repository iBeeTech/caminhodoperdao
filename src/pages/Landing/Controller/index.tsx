import React, { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { landingService } from "../../../services/landing/landing.service";
import { HttpError } from "../../../services/http/client";
import LandingView from "../View/LandingView";
import {
  AvailabilityState,
  LandingPhase,
  LandingTone,
  defaultLandingContent,
} from "../Model";
import {
  RegistrationPayload,
  RegistrationStatusResponse,
} from "../../../services/landing/landing.types";

const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

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
  const [phase, setPhase] = useState<LandingPhase>("check");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<LandingTone>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [capacityCallout, setCapacityCallout] = useState<string | null>(null);

  const existingDataRef = useRef<RegistrationStatusResponse | null>(null);

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
      error: availabilityError ? "Não foi possível verificar vagas agora." : "",
      totalFull: availabilityData?.totalFull ?? false,
      monasteryFull: availabilityData?.monasteryFull ?? false,
    }),
    [availabilityData, availabilityError, isAvailabilityLoading]
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

    if (!name) newErrors.name = "Obrigatório";
    if (!email) newErrors.email = "Obrigatório";
    else if (!emailRegex.test(email)) newErrors.email = "Email inválido";

    return newErrors;
  };

  const validateRegistrationForm = () => {
    const newErrors: Record<string, string> = {};
    const phoneDigits = getFieldValue(phoneRef.current).replace(/\D/g, "");
    const cepDigits = getFieldValue(cepRef.current).replace(/\D/g, "");

    const requiredFields: Array<{ key: string; value: string; message: string; validator?: (value: string) => boolean }> = [
      { key: "name", value: getFieldValue(nameRef.current), message: "Obrigatório" },
      {
        key: "email",
        value: getFieldValue(emailRef.current),
        message: "Email inválido",
        validator: value => emailRegex.test(value),
      },
      { key: "phone", value: phoneDigits, message: "Informe DDD + 9 dígitos", validator: value => value.length === 11 },
      { key: "cep", value: cepDigits, message: "CEP inválido", validator: value => value.length === 8 },
      { key: "address", value: getFieldValue(addressRef.current), message: "Obrigatório" },
      { key: "number", value: getFieldValue(numberRef.current), message: "Obrigatório" },
      { key: "city", value: getFieldValue(cityRef.current), message: "Obrigatório" },
      { key: "state", value: getFieldValue(stateRef.current), message: "Obrigatório" },
    ];

    requiredFields.forEach(field => {
      const isValid = field.validator ? field.validator(field.value) : !!field.value;
      if (!isValid) newErrors[field.key] = field.message;
    });

    const sleepSelection = isMonasterySlotUnavailable
      ? "no"
      : sleepAtMonasteryRef.current?.value ?? "";
    if (!sleepSelection) newErrors.sleepAtMonastery = "Selecione uma opção";

    const alreadySleeper = existingDataRef.current?.sleep_at_monastery === 1;
    if (
      sleepSelection === "yes" &&
      availability.monasteryFull &&
      !alreadySleeper
    ) {
      newErrors.sleepAtMonastery = "Vagas no mosteiro esgotadas";
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
      return;
    }

    const email = getFieldValue(emailRef.current);

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
        setStatusMessage(result.message ?? "Sua inscrição já está confirmada.");
        setStatusTone("success");
        setPhase("status");
        return;
      }

      if (result.expired || normalizedStatus === "CANCELED") {
        setStatusMessage("Pix expirado. Edite para reenviar.");
        setStatusTone("error");
        setPhase("status");
      } else if (normalizedStatus === "PENDING") {
        setStatusMessage("Pagamento pendente. Use o PIX abaixo.");
        setStatusTone("warn");
        setPhase("status");
      } else {
        setPhase("form");
      }
    } catch (error) {
      setStatusMessage("Não foi possível verificar agora. Tente novamente.");
      setStatusTone("error");
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetStatusState();
    setErrors({});

    if (availability.totalFull && !existingDataRef.current?.exists) {
      setCapacityCallout("As inscrições estão esgotadas no momento. Volte mais tarde.");
      return;
    }

    const validationErrors = validateRegistrationForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatusMessage("Preencha os campos obrigatórios.");
      setStatusTone("error");
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
      setStatusMessage(
        data.message ?? "Sua inscrição será finalizada quando você realizar o pagamento do PIX."
      );
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
            setStatusMessage("Sua inscrição já está confirmada.");
            setStatusTone("success");
          } else if (normalizedStatus === "PENDING") {
            setStatusMessage("Inscrição pendente. Você pode usar o PIX abaixo.");
            setStatusTone("warn");
          } else if (normalizedStatus === "CANCELED") {
            setStatusMessage("Pix expirado. Edite para reenviar.");
            setStatusTone("error");
          } else {
            setStatusMessage("Inscrição existente.");
            setStatusTone(null);
          }

          setPhase("status");
        } catch (statusError) {
          setStatusMessage("Não foi possível processar. Tente novamente.");
          setStatusTone("error");
        }
        return;
      }

      setStatusMessage("Não foi possível processar. Tente novamente.");
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
        setCapacityCallout("As inscrições estão esgotadas no momento. Volte mais tarde.");
        return;
      }
      setPhase("form");
    } catch (error) {
      setStatusMessage("Não foi possível validar vagas agora.");
      setStatusTone("error");
    }
  };

  return (
    <LandingView
      content={defaultLandingContent}
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
