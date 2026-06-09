import React, { ChangeEvent, FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { landingService } from "../../../../../services/landing/landing.service";
import { Callout, FormField, Input } from "../../../../../components";
import TrackedButton from "../../../../../components/analytics/TrackedButton";
import { LANDING_CTAS } from "../../../../../utils/analytics/catalog/ctas";
import { LANDING_SECTIONS } from "../../../../../utils/analytics/catalog/sections";
import { formatCpfBR } from "../../../../../utils/formatters/cpf";
import { formatPhoneBR } from "../../../../../utils/formatters/phone";
import { isValidCpf } from "../../../../../utils/validators/cpf";

type WaitlistErrors = Partial<{ name: string; cpf: string; phone: string }>;

// Formulário curto da lista de espera, exibido quando as inscrições esgotam
// (totalFull). Nome + CPF + WhatsApp; se abrir vaga, o admin avisa pela ordem
// de entrada. Autocontido: chama o landingService direto (mesmo padrão da
// troca geral<->pernoite no SignupSection).
const WaitlistForm: React.FC = () => {
  const { t } = useTranslation("landing");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<WaitlistErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultTone, setResultTone] = useState<"success" | "warning" | "error" | null>(null);
  const [isDone, setIsDone] = useState(false);

  const clearError = (field: keyof WaitlistErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleCpfChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpfBR(event.target.value));
    clearError("cpf");
  };

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
    setPhone(formatPhoneBR(digits));
    clearError("phone");
  };

  const validate = (): WaitlistErrors => {
    const validationErrors: WaitlistErrors = {};
    if (!name.trim()) {
      validationErrors.name = t("signup.errors.required");
    }
    if (!cpf.trim()) {
      validationErrors.cpf = t("signup.errors.required");
    } else if (!isValidCpf(cpf)) {
      validationErrors.cpf = t("signup.errors.cpfInvalid");
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (!phoneDigits) {
      validationErrors.phone = t("signup.errors.required");
    } else if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      validationErrors.phone = t("signup.waitlist.errors.phoneInvalid");
    }
    return validationErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResultMessage(null);
    setResultTone(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await landingService.joinWaitlist({
        name: name.trim(),
        cpf: cpf.replace(/\D/g, ""),
        phone: phone.replace(/\D/g, ""),
      });
      setResultMessage(
        result.status === "ALREADY_ON_WAITLIST"
          ? t("signup.waitlist.alreadyOnList")
          : t("signup.waitlist.success")
      );
      setResultTone("success");
      setIsDone(true);
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const body = error?.response?.body ?? error?.response?.data ?? error?.body ?? error?.data;

      if (status === 409 && body?.error === "already_registered") {
        setResultMessage(t("signup.waitlist.alreadyRegistered"));
        setResultTone("warning");
        return;
      }
      if (status === 400 && body?.error === "invalid_cpf") {
        setErrors((prev) => ({ ...prev, cpf: t("signup.errors.cpfInvalid") }));
        return;
      }
      if (status === 400 && body?.error === "invalid_phone") {
        setErrors((prev) => ({ ...prev, phone: t("signup.waitlist.errors.phoneInvalid") }));
        return;
      }
      setResultMessage(t("signup.waitlist.errors.generic"));
      setResultTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone && resultMessage) {
    return <Callout variant="success">{resultMessage}</Callout>;
  }

  return (
    <form noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
      <div style={{ textAlign: "center" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", color: "#1f2937" }}>{t("signup.waitlist.title")}</h3>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.5 }}>{t("signup.waitlist.description")}</p>
      </div>

      {resultMessage && resultTone && <Callout variant={resultTone}>{resultMessage}</Callout>}

      <FormField label={t("signup.waitlist.nameLabel")} htmlFor="waitlist-name" error={errors.name} required>
        <Input
          id="waitlist-name"
          name="waitlist-name"
          type="text"
          placeholder={t("signup.waitlist.namePlaceholder")}
          value={name}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setName(event.target.value);
            clearError("name");
          }}
          autoComplete="name"
        />
      </FormField>

      <FormField label={t("signup.waitlist.cpfLabel")} htmlFor="waitlist-cpf" error={errors.cpf} required>
        <Input
          id="waitlist-cpf"
          name="waitlist-cpf"
          type="text"
          placeholder={t("signup.waitlist.cpfPlaceholder")}
          value={cpf}
          onChange={handleCpfChange}
          inputMode="numeric"
          autoComplete="off"
        />
      </FormField>

      <FormField label={t("signup.waitlist.whatsappLabel")} htmlFor="waitlist-phone" error={errors.phone} required>
        <Input
          id="waitlist-phone"
          name="waitlist-phone"
          type="text"
          placeholder={t("signup.waitlist.whatsappPlaceholder")}
          value={phone}
          onChange={handlePhoneChange}
          inputMode="tel"
          autoComplete="tel"
        />
      </FormField>

      <TrackedButton
        pageName="landing"
        ctaId={LANDING_CTAS.FORM_SUBMIT}
        sectionId={LANDING_SECTIONS.REGISTRATION_FORM.id}
        sectionName={LANDING_SECTIONS.REGISTRATION_FORM.name}
        position={LANDING_SECTIONS.REGISTRATION_FORM.position}
        variant="primary"
        size="md"
        type="submit"
        disabled={isSubmitting}
        loading={isSubmitting}
      >
        {isSubmitting ? t("signup.waitlist.loading") : t("signup.waitlist.submit")}
      </TrackedButton>
    </form>
  );
};

export default WaitlistForm;
