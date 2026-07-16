import React, { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { landingService } from "../../services/landing/landing.service";
import { Callout, FormField, Input } from "../../components";
import { ErrorText } from "../../components/molecules/FormField/FormField.styles";
import { formatCpfBR } from "../../utils/formatters/cpf";
import { formatPhoneBR } from "../../utils/formatters/phone";
import { formatCepBR } from "../../utils/formatters/cep";
import { getFieldValue, focusFirstError } from "../../utils/dom/forms";
import { validateRegistrationForm } from "../../utils/landing/validation";
import { useAddressByCep } from "../../hooks/useAddressByCep";
import type { FieldRefsType } from "../../utils/landing/types";
import type { RegistrationPayload } from "../../services/landing/landing.types";

const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

type Phase = "code" | "form" | "status";

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 640, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
  card: {
    border: "1px solid #e5e7eb", borderRadius: 16, padding: "1.75rem 1.5rem", background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  // Espelha o visual dos Inputs do design system usados nesta página.
  select: {
    width: "100%", boxSizing: "border-box", padding: "0.75rem 0.9rem", borderRadius: 8,
    border: "1px solid #d1d5db", fontSize: "1rem", background: "#fff", color: "#111827",
    font: "inherit",
  },
  title: { fontSize: "1.5rem", margin: "0 0 0.5rem", color: "#111827" },
  subtitle: { color: "#4b5563", marginBottom: "1.5rem", lineHeight: 1.5 },
  codeInput: {
    width: "100%", boxSizing: "border-box", padding: "0.9rem 1rem", borderRadius: 12,
    border: "2px solid #d1d5db", fontSize: "1.4rem", letterSpacing: "0.25em", textAlign: "center",
    textTransform: "uppercase", fontWeight: 700,
  },
  primaryBtn: {
    marginTop: "1.25rem", width: "100%", padding: "0.85rem 1rem", borderRadius: 12, border: "none",
    background: "#1f7a3d", color: "#fff", fontWeight: 700, fontSize: "1.05rem", cursor: "pointer",
  },
  fieldBlock: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  fieldLabel: { fontWeight: 600, color: "#333" },
  radioRow: { display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" },
  radioLabel: { display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" },
  termsLabel: {
    display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", flexWrap: "wrap",
    fontWeight: 600, color: "#333",
  },
  pixBox: {
    border: "1px solid #facc15", background: "#fffcf2", borderRadius: 12, padding: "1.25rem",
    marginTop: "1rem", textAlign: "center",
  },
  pixCode: {
    width: "100%", boxSizing: "border-box", minHeight: 90, marginTop: "0.75rem", padding: "0.6rem",
    borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.8rem", wordBreak: "break-all",
  },
  copyBtn: {
    marginTop: "0.6rem", padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #1f7a3d",
    background: "#fff", color: "#1f7a3d", fontWeight: 700, cursor: "pointer",
  },
  qr: { maxWidth: 220, margin: "1rem auto 0", display: "block" },
};

const ConvitePage: React.FC = () => {
  const { t } = useTranslation("landing");
  const [searchParams] = useSearchParams();
  const { fetchAddress } = useAddressByCep();

  const [phase, setPhase] = useState<Phase>("code");
  const [code, setCode] = useState<string>(normalizeCode(searchParams.get("convite") ?? searchParams.get("code") ?? ""));
  const [validatedCode, setValidatedCode] = useState<string>("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasAllergyMedication, setHasAllergyMedication] = useState<string>("");
  const [hasDietaryRestriction, setHasDietaryRestriction] = useState<string>("");

  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const cpfRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLSelectElement>(null);
  const dateOfBirthRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const cepRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const complementRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const sleepAtMonasteryRef = useRef<HTMLSelectElement>(null); // não renderizado (convite é só geral)
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
    gender: genderRef,
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
    companionRef,
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

  const clearError = (field: string) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const handleValidateCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeCode(code);
    if (!normalized) {
      setCodeError(t("invite.errors.required"));
      return;
    }
    setIsValidating(true);
    setCodeError(null);
    try {
      const res = await landingService.validateInvite(normalized);
      if (res.valid) {
        setValidatedCode(normalized);
        setStatusMessage(null);
        setPhase("form");
      } else {
        setCodeError(t("invite.errors.invalid"));
      }
    } catch {
      setCodeError(t("invite.errors.generic"));
    } finally {
      setIsValidating(false);
    }
  };

  const handleCpfChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.target.value = formatCpfBR(event.target.value);
    clearError("cpf");
  };

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>, field: "phone" | "emergencyContactPhone") => {
    event.target.value = formatPhoneBR(event.target.value);
    clearError(field);
  };

  const handleCepChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const masked = formatCepBR(event.target.value);
    event.target.value = masked;
    clearError("cep");
    if (masked.replace(/\D/g, "").length === 8) {
      const address = await fetchAddress(masked);
      if (address) {
        const full = address.neighborhood ? `${address.street}, ${address.neighborhood}` : address.street;
        if (addressRef.current) addressRef.current.value = full;
        if (cityRef.current) cityRef.current.value = address.city;
        if (stateRef.current) stateRef.current.value = address.state;
        clearError("address");
        clearError("city");
        clearError("state");
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);

    // Convite é sempre sem pernoite: isMonasterySlotUnavailable pula a validação de pernoite.
    const { errors: validationErrors } = validateRegistrationForm(t, fieldRefs, {
      isMonasterySlotUnavailable: true,
    });

    if (allergyMedicationYesRef.current?.checked && !getFieldValue(allergyMedicationDetailsRef.current)) {
      validationErrors.allergyMedicationDetails = t("signup.errors.allergyMedicationDetailsRequired");
    }
    if (dietaryRestrictionYesRef.current?.checked && !getFieldValue(dietaryRestrictionDetailsRef.current)) {
      validationErrors.dietaryRestrictionDetails = t("signup.errors.dietaryRestrictionDetailsRequired");
    }
    if (!allergyMedicationYesRef.current?.checked && !allergyMedicationNoRef.current?.checked) {
      validationErrors.allergyMedication = t("signup.errors.allergyMedicationRequired");
    }
    if (!dietaryRestrictionYesRef.current?.checked && !dietaryRestrictionNoRef.current?.checked) {
      validationErrors.dietaryRestriction = t("signup.errors.dietaryRestrictionRequired");
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstError(validationErrors, fieldRefs);
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      const data = await landingService.register({
        name: getFieldValue(nameRef.current),
        email: getFieldValue(emailRef.current),
        cpf: getFieldValue(cpfRef.current).replace(/\D/g, ""),
        gender: (genderRef.current?.value ?? "") as RegistrationPayload["gender"],
        dateOfBirth: getFieldValue(dateOfBirthRef.current),
        phone: getFieldValue(phoneRef.current),
        cep: getFieldValue(cepRef.current),
        address: getFieldValue(addressRef.current),
        number: getFieldValue(numberRef.current),
        complement: getFieldValue(complementRef.current),
        city: getFieldValue(cityRef.current),
        state: (getFieldValue(stateRef.current) || "").toUpperCase(),
        sleepAtMonastery: false,
        termsAccepted: termsAcceptedRef.current?.checked === true,
        hasAllergyMedication: allergyMedicationYesRef.current?.checked === true,
        allergyMedicationDetails: allergyMedicationYesRef.current?.checked
          ? getFieldValue(allergyMedicationDetailsRef.current)
          : "",
        hasDietaryRestriction: dietaryRestrictionYesRef.current?.checked === true,
        dietaryRestrictionDetails: dietaryRestrictionYesRef.current?.checked
          ? getFieldValue(dietaryRestrictionDetailsRef.current)
          : "",
        emergencyContactName: getFieldValue(emergencyContactNameRef.current),
        emergencyContactPhone: getFieldValue(emergencyContactPhoneRef.current),
        inviteCode: validatedCode,
      });
      setQrCodeText(data.qrCodeText ?? null);
      setQrCodeImageUrl(data.qrCodeImageUrl ?? null);
      setPhase("status");
    } catch (error: any) {
      const body = error?.response?.body ?? error?.body ?? error?.data;
      const errorCode = body?.error as string | undefined;
      if (errorCode === "invalid_invite" || errorCode === "invite_already_used") {
        setStatusMessage(t("invite.errors.consumed"));
        setPhase("code");
        setValidatedCode("");
      } else if (errorCode === "cpf_already_registered") {
        setErrors((prev) => ({ ...prev, cpf: t("signup.callouts.cpfAlreadyRegistered") }));
        setStatusMessage(t("signup.callouts.cpfAlreadyRegistered"));
      } else if (errorCode === "registration_exists") {
        setStatusMessage(t("signup.callouts.registrationExists"));
      } else {
        setStatusMessage(t("signup.status.processingError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!qrCodeText) return;
    try {
      await navigator.clipboard.writeText(qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  };

  // Confirma o pagamento em segundo plano (polling leve pelo CPF).
  React.useEffect(() => {
    if (phase !== "status" || paid) return;
    const cpf = getFieldValue(cpfRef.current).replace(/\D/g, "");
    if (!cpf) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await landingService.checkStatus(cpf);
        if (!cancelled && r?.status === "PAID") setPaid(true);
      } catch {
        /* mantém aguardando */
      }
    };
    poll();
    const id = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, paid]);

  return (
    <div style={s.page}>
      <div style={s.card}>
        {phase === "code" && (
          <form onSubmit={handleValidateCode} noValidate>
            <h1 style={s.title}>{t("invite.title")}</h1>
            <p style={s.subtitle}>{t("invite.subtitle")}</p>
            {statusMessage && <Callout variant="warning">{statusMessage}</Callout>}
            <label htmlFor="invite-code" style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
              {t("invite.codeLabel")}
            </label>
            <input
              id="invite-code"
              style={s.codeInput}
              value={code}
              onChange={(e) => {
                setCode(normalizeCode(e.target.value));
                setCodeError(null);
              }}
              placeholder="••••••"
              maxLength={12}
              autoComplete="off"
            />
            {codeError && <ErrorText role="alert">{codeError}</ErrorText>}
            <button type="submit" style={s.primaryBtn} disabled={isValidating}>
              {isValidating ? t("invite.validating") : t("invite.submitCode")}
            </button>
          </form>
        )}

        {phase === "form" && (
          <form onSubmit={handleSubmit} noValidate>
            <h1 style={s.title}>{t("signup.registrationForm.title")}</h1>
            <div style={{ marginBottom: 20 }}>
              <Callout variant="success">{t("invite.validBanner")}</Callout>
            </div>

            <FormField label={t("signup.registrationForm.nameLabel")} htmlFor="c-name" error={errors.name} required>
              <Input id="c-name" ref={nameRef} type="text" placeholder={t("signup.registrationForm.namePlaceholder")} onChange={() => clearError("name")} autoComplete="name" />
            </FormField>

            <FormField label={t("signup.registrationForm.cpfLabel")} htmlFor="c-cpf" error={errors.cpf} required>
              <Input id="c-cpf" ref={cpfRef} type="text" placeholder={t("signup.registrationForm.cpfPlaceholder")} onChange={handleCpfChange} inputMode="numeric" autoComplete="off" />
            </FormField>

            <FormField label={t("signup.registrationForm.emailLabel")} htmlFor="c-email" error={errors.email} required>
              <Input id="c-email" ref={emailRef} type="email" placeholder={t("signup.registrationForm.emailPlaceholder")} onChange={() => clearError("email")} autoComplete="email" />
            </FormField>

            <FormField
              label={t("signup.registrationForm.genderLabel")}
              htmlFor="c-gender"
              error={errors.gender}
              required
            >
              {/* <select> nativo: esta página não usa o design system de Select. */}
              <select
                id="c-gender"
                ref={genderRef}
                defaultValue=""
                onChange={() => clearError("gender")}
                style={s.select}
              >
                <option value="" disabled>
                  {t("signup.registrationForm.genderPlaceholder")}
                </option>
                <option value="MASCULINO">{t("signup.registrationForm.genderMale")}</option>
                <option value="FEMININO">{t("signup.registrationForm.genderFemale")}</option>
                <option value="NAO_INFORMADO">
                  {t("signup.registrationForm.genderUnspecified")}
                </option>
              </select>
            </FormField>

            <FormField label={t("signup.registrationForm.dateOfBirthLabel")} htmlFor="c-dob" error={errors.dateOfBirth} required>
              <Input id="c-dob" ref={dateOfBirthRef} type="date" onChange={() => clearError("dateOfBirth")} autoComplete="bday" />
            </FormField>

            <FormField label={t("signup.registrationForm.whatsappLabel")} htmlFor="c-phone" error={errors.phone} required>
              <Input id="c-phone" ref={phoneRef} type="text" placeholder={t("signup.registrationForm.whatsappPlaceholder")} onChange={(e) => handlePhoneChange(e, "phone")} inputMode="tel" autoComplete="tel" />
            </FormField>

            <FormField label={t("signup.registrationForm.emergencyContactNameLabel")} htmlFor="c-ecn" error={errors.emergencyContactName} required>
              <Input id="c-ecn" ref={emergencyContactNameRef} type="text" placeholder={t("signup.registrationForm.emergencyContactNamePlaceholder")} onChange={() => clearError("emergencyContactName")} autoComplete="name" />
            </FormField>

            <FormField label={t("signup.registrationForm.emergencyContactPhoneLabel")} htmlFor="c-ecp" error={errors.emergencyContactPhone} required>
              <Input id="c-ecp" ref={emergencyContactPhoneRef} type="text" placeholder={t("signup.registrationForm.emergencyContactPhonePlaceholder")} onChange={(e) => handlePhoneChange(e, "emergencyContactPhone")} inputMode="tel" autoComplete="tel" />
            </FormField>

            <FormField label={t("signup.registrationForm.cepLabel")} htmlFor="c-cep" error={errors.cep} required>
              <Input id="c-cep" ref={cepRef} type="text" placeholder={t("signup.registrationForm.cepPlaceholder")} onChange={handleCepChange} inputMode="numeric" autoComplete="postal-code" />
            </FormField>

            <FormField label={t("signup.registrationForm.addressLabel")} htmlFor="c-address" error={errors.address} required>
              <Input id="c-address" ref={addressRef} type="text" placeholder={t("signup.registrationForm.addressPlaceholder")} onChange={() => clearError("address")} autoComplete="street-address" />
            </FormField>

            <FormField label={t("signup.registrationForm.numberLabel")} htmlFor="c-number" error={errors.number} required>
              <Input id="c-number" ref={numberRef} type="text" placeholder={t("signup.registrationForm.numberPlaceholder")} onChange={() => clearError("number")} inputMode="numeric" autoComplete="off" />
            </FormField>

            <FormField label={t("signup.registrationForm.complementLabel")} htmlFor="c-complement">
              <Input id="c-complement" ref={complementRef} type="text" placeholder={t("signup.registrationForm.complementPlaceholder")} autoComplete="address-line2" />
            </FormField>

            <FormField label={t("signup.registrationForm.cityLabel")} htmlFor="c-city" error={errors.city} required>
              <Input id="c-city" ref={cityRef} type="text" placeholder={t("signup.registrationForm.cityPlaceholder")} onChange={() => clearError("city")} autoComplete="address-level2" />
            </FormField>

            <FormField label={t("signup.registrationForm.stateLabel")} htmlFor="c-state" error={errors.state} required>
              <Input id="c-state" ref={stateRef} type="text" maxLength={2} placeholder={t("signup.registrationForm.statePlaceholder")} onChange={() => clearError("state")} autoComplete="address-level1" />
            </FormField>

            <div style={s.fieldBlock}>
              <span style={s.fieldLabel}>
                <span style={{ color: "#b91c1c" }} aria-hidden="true">* </span>
                {t("signup.registrationForm.allergyMedicationQuestion")}
              </span>
              <div style={s.radioRow}>
                <label style={s.radioLabel}>
                  <input ref={allergyMedicationYesRef} id="c-allergyYes" type="radio" name="c-allergy" value="yes" onChange={() => { setHasAllergyMedication("yes"); clearError("allergyMedication"); }} />
                  {t("signup.registrationForm.yes")}
                </label>
                <label style={s.radioLabel}>
                  <input ref={allergyMedicationNoRef} id="c-allergyNo" type="radio" name="c-allergy" value="no" onChange={() => { setHasAllergyMedication("no"); if (allergyMedicationDetailsRef.current) allergyMedicationDetailsRef.current.value = ""; clearError("allergyMedication"); clearError("allergyMedicationDetails"); }} />
                  {t("signup.registrationForm.no")}
                </label>
              </div>
              {hasAllergyMedication === "yes" && (
                <Input ref={allergyMedicationDetailsRef} id="c-allergyDetails" type="text" placeholder={t("signup.registrationForm.allergyMedicationPlaceholder")} onChange={() => clearError("allergyMedicationDetails")} />
              )}
              {errors.allergyMedication && <ErrorText role="alert">{errors.allergyMedication}</ErrorText>}
              {errors.allergyMedicationDetails && <ErrorText role="alert">{errors.allergyMedicationDetails}</ErrorText>}
            </div>

            <div style={s.fieldBlock}>
              <span style={s.fieldLabel}>
                <span style={{ color: "#b91c1c" }} aria-hidden="true">* </span>
                {t("signup.registrationForm.dietaryRestrictionQuestion")}
              </span>
              <div style={s.radioRow}>
                <label style={s.radioLabel}>
                  <input ref={dietaryRestrictionYesRef} id="c-dietYes" type="radio" name="c-diet" value="yes" onChange={() => { setHasDietaryRestriction("yes"); clearError("dietaryRestriction"); }} />
                  {t("signup.registrationForm.yes")}
                </label>
                <label style={s.radioLabel}>
                  <input ref={dietaryRestrictionNoRef} id="c-dietNo" type="radio" name="c-diet" value="no" onChange={() => { setHasDietaryRestriction("no"); if (dietaryRestrictionDetailsRef.current) dietaryRestrictionDetailsRef.current.value = ""; clearError("dietaryRestriction"); clearError("dietaryRestrictionDetails"); }} />
                  {t("signup.registrationForm.no")}
                </label>
              </div>
              {hasDietaryRestriction === "yes" && (
                <Input ref={dietaryRestrictionDetailsRef} id="c-dietDetails" type="text" placeholder={t("signup.registrationForm.dietaryRestrictionPlaceholder")} onChange={() => clearError("dietaryRestrictionDetails")} />
              )}
              {errors.dietaryRestriction && <ErrorText role="alert">{errors.dietaryRestriction}</ErrorText>}
              {errors.dietaryRestrictionDetails && <ErrorText role="alert">{errors.dietaryRestrictionDetails}</ErrorText>}
            </div>

            <div style={{ marginTop: 8 }}>
              <label htmlFor="c-terms" style={s.termsLabel}>
                <span style={{ color: "#b91c1c" }} aria-hidden="true">*</span>
                <input ref={termsAcceptedRef} id="c-terms" type="checkbox" onChange={() => clearError("termsAccepted")} />
                <span>
                  {t("signup.registrationForm.termsLabel")}{" "}
                  <Link to="/responsabilityTerms" style={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }}>
                    {t("signup.registrationForm.termsLinkText")}
                  </Link>.
                </span>
              </label>
              {errors.termsAccepted && <ErrorText role="alert">{errors.termsAccepted}</ErrorText>}
            </div>

            {statusMessage && <div style={{ marginTop: 12 }}><Callout variant="error">{statusMessage}</Callout></div>}

            <button type="submit" style={s.primaryBtn} disabled={isSubmitting}>
              {isSubmitting ? t("signup.registrationForm.loading") : t("signup.registrationForm.submit")}
            </button>
          </form>
        )}

        {phase === "status" && (
          <div>
            <h1 style={s.title}>{t("invite.title")}</h1>
            {paid ? (
              <Callout variant="success">{t("signup.status.paidBox")}</Callout>
            ) : (
              <>
                <Callout variant="warning">{t("signup.status.pendingPaymentWindow")}</Callout>
                <div style={s.pixBox}>
                  <strong>{t("signup.status.pixCopyLabel")}</strong>
                  <textarea style={s.pixCode} readOnly value={qrCodeText ?? ""} />
                  <button type="button" style={s.copyBtn} onClick={handleCopy}>
                    {copied ? t("signup.status.copyCopied") : t("signup.status.copyAction")}
                  </button>
                  {qrCodeImageUrl && <img src={qrCodeImageUrl} alt={t("signup.status.qrCodeAlt")} style={s.qr} />}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConvitePage;
