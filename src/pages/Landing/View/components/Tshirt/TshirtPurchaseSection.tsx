import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Callout, FormField, Input } from "../../../../../components";
import TrackedButton from "../../../../../components/analytics/TrackedButton";
import { ErrorText } from "../../../../../components/molecules/FormField/FormField.styles";
import { HttpError } from "../../../../../services/http/client";
import { landingService } from "../../../../../services/landing/landing.service";
import {
  TshirtPurchaseResponse,
  TshirtSizes,
  TshirtStatusResponse,
} from "../../../../../services/landing/landing.types";
import { LANDING_CTAS } from "../../../../../utils/analytics/catalog/ctas";
import { LANDING_SECTIONS } from "../../../../../utils/analytics/catalog/sections";
import { formatCpfBR } from "../../../../../utils/formatters/cpf";
import { canonicalizeCpf, isValidCpf } from "../../../../../utils/validators/cpf";
import camisetaFrente from "../../../../../assets/camiseta-frente.png";
import camisetaTras from "../../../../../assets/camiseta-tras.png";
import {
  Actions,
  Container,
  CopyButton,
  Form,
  Header,
  ImageFigure,
  ImageGrid,
  PixBox,
  PixLabel,
  PixLabelContainer,
  PixTextarea,
  QRCodeContainer,
  QRCodeImage,
  QuantityField,
  QuantityGrid,
  SizeGuideLink,
  Summary,
  TotalsList,
  TshirtCard,
  TshirtImage,
  TshirtSectionWrapper,
} from "./TshirtPurchaseSection.styles";

type TshirtErrorKey = "name" | "cpf" | "quantities";
type TshirtErrors = Partial<Record<TshirtErrorKey, string>>;

const PRICE_PER_TSHIRT_CENTS = 10_000;
const SIZE_KEYS: Array<keyof TshirtSizes> = ["P", "M", "G", "GG"];

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function formatCurrencyBRL(valueInCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

const TshirtPurchaseSection: React.FC = () => {
  const { t } = useTranslation("landing");

  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [sizes, setSizes] = useState<TshirtSizes>({ P: 0, M: 0, G: 0, GG: 0 });
  const [errors, setErrors] = useState<TshirtErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [paidTotals, setPaidTotals] = useState<TshirtStatusResponse["paidTotals"] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedBrcode, setCopiedBrcode] = useState(false);

  const totalQuantity = useMemo(
    () => sizes.P + sizes.M + sizes.G + sizes.GG,
    [sizes.G, sizes.GG, sizes.M, sizes.P]
  );

  const totalAmountCents = useMemo(
    () => totalQuantity * PRICE_PER_TSHIRT_CENTS,
    [totalQuantity]
  );

  const hasPendingStatus = status === "PENDING";

  React.useEffect(() => {
    if (!hasPendingStatus) return;

    const normalizedCpf = canonicalizeCpf(cpf);
    const normalizedName = normalizeName(name);
    if (!normalizedCpf || !normalizedName) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const result = await landingService.checkTshirtStatus(normalizedCpf, normalizedName);
        if (cancelled || !result.exists) return;

        applyStatusResult(result);
      } catch {
        // Mantem estado atual para o usuario checar manualmente
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [hasPendingStatus, cpf, name]);

  const applyPurchaseResult = (result: TshirtPurchaseResponse) => {
    const nextStatus = result.status ?? "PENDING";
    setStatus(nextStatus);
    setQrCodeText(result.qrCodeText ?? null);
    setQrCodeImageUrl(result.qrCodeImageUrl ?? null);
    setMessage(
      result.message ??
        (nextStatus === "PENDING"
          ? t("tshirt.status.pending")
          : nextStatus === "PAID"
            ? t("tshirt.status.paid")
            : t("tshirt.status.canceled"))
    );
  };

  const applyStatusResult = (result: TshirtStatusResponse) => {
    const nextStatus = result.status ?? null;
    setStatus(nextStatus);
    setQrCodeText(result.qrCodeText ?? null);
    setQrCodeImageUrl(result.qrCodeImageUrl ?? null);
    setPaidTotals(result.paidTotals ?? null);

    if (nextStatus === "PAID") {
      setMessage(result.message ?? t("tshirt.status.paid"));
      return;
    }

    if (nextStatus === "CANCELED") {
      setMessage(result.message ?? t("tshirt.status.canceled"));
      return;
    }

    if (nextStatus === "PENDING") {
      setMessage(result.message ?? t("tshirt.status.pending"));
      return;
    }

    setMessage(null);
  };

  const resetStatus = () => {
    setStatus(null);
    setMessage(null);
    setQrCodeText(null);
    setQrCodeImageUrl(null);
    setPaidTotals(null);
  };

  const validateForm = (): TshirtErrors => {
    const nextErrors: TshirtErrors = {};

    if (!normalizeName(name)) {
      nextErrors.name = t("tshirt.errors.required");
    }

    const cpfDigits = canonicalizeCpf(cpf);
    if (!cpfDigits) {
      nextErrors.cpf = t("tshirt.errors.required");
    } else if (!isValidCpf(cpfDigits)) {
      nextErrors.cpf = t("tshirt.errors.invalidCpf");
    }

    if (totalQuantity <= 0) {
      nextErrors.quantities = t("tshirt.errors.quantityRequired");
    }

    return nextErrors;
  };

  const handleApiError = (error: unknown, fallbackKey: string) => {
    if (!(error instanceof HttpError)) {
      setMessage(t(fallbackKey));
      return;
    }

    const payload = (error.body as { error?: string } | undefined) ?? {};

    if (payload.error === "cpf_used_by_other_name") {
      setMessage(t("tshirt.errors.cpfUsedByOtherName"));
      return;
    }

    if (payload.error === "invalid_cpf") {
      setErrors((prev) => ({ ...prev, cpf: t("tshirt.errors.invalidCpf") }));
      return;
    }

    if (payload.error === "name_required") {
      setErrors((prev) => ({ ...prev, name: t("tshirt.errors.required") }));
      return;
    }

    if (payload.error === "quantity_required" || payload.error === "invalid_quantity") {
      setErrors((prev) => ({ ...prev, quantities: t("tshirt.errors.quantityRequired") }));
      return;
    }

    if (payload.error === "payment_provider_not_configured") {
      setMessage(t("tshirt.status.paymentConfigError"));
      return;
    }

    if (payload.error === "pix_creation_failed") {
      setMessage(t("tshirt.status.pixError"));
      return;
    }

    setMessage(t(fallbackKey));
  };

  const handleQuantityChange = (size: keyof TshirtSizes, rawValue: string) => {
    const value = Number(rawValue);
    const normalized = Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;

    setSizes((prev) => ({ ...prev, [size]: normalized }));
    setErrors((prev) => ({ ...prev, quantities: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetStatus();

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedCpf = canonicalizeCpf(cpf);
      const result = await landingService.purchaseTshirt({
        name: normalizeName(name),
        cpf: normalizedCpf,
        sizes,
      });
      applyPurchaseResult(result);
    } catch (error) {
      handleApiError(error, "tshirt.status.submitError");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    const normalizedCpf = canonicalizeCpf(cpf);
    const normalizedName = normalizeName(name);

    const nextErrors: TshirtErrors = {};
    if (!normalizedName) {
      nextErrors.name = t("tshirt.errors.required");
    }
    if (!normalizedCpf) {
      nextErrors.cpf = t("tshirt.errors.required");
    } else if (!isValidCpf(normalizedCpf)) {
      nextErrors.cpf = t("tshirt.errors.invalidCpf");
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsChecking(true);

    try {
      const result = await landingService.checkTshirtStatus(normalizedCpf, normalizedName);

      if (!result.exists) {
        resetStatus();
        setMessage(t("tshirt.status.notFound"));
        return;
      }

      applyStatusResult(result);
    } catch (error) {
      handleApiError(error, "tshirt.status.checkError");
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopyBrcode = async () => {
    if (!qrCodeText) return;

    try {
      await navigator.clipboard.writeText(qrCodeText);
      setCopiedBrcode(true);
      setTimeout(() => setCopiedBrcode(false), 1800);
    } catch {
      setMessage(t("tshirt.status.copyError"));
    }
  };

  const handleStartNewPurchase = () => {
    setSizes({ P: 0, M: 0, G: 0, GG: 0 });
    setErrors({});
    resetStatus();
  };

  return (
    <TshirtSectionWrapper id="tshirt-purchase">
      <Container>
        <TshirtCard>
          <Header>
            <h2>{t("tshirt.title")}</h2>
            <p>{t("tshirt.description")}</p>
          </Header>

          <ImageGrid>
            <ImageFigure>
              <TshirtImage src={camisetaFrente} alt={t("tshirt.images.frontAlt")} loading="lazy" />
              <figcaption>{t("tshirt.images.frontCaption")}</figcaption>
            </ImageFigure>
            <ImageFigure>
              <TshirtImage src={camisetaTras} alt={t("tshirt.images.backAlt")} loading="lazy" />
              <figcaption>{t("tshirt.images.backCaption")}</figcaption>
            </ImageFigure>
          </ImageGrid>

          <SizeGuideLink href="/medidas-camiseta.jpg" target="_blank" rel="noreferrer">
            {t("tshirt.sizeGuideLink")}
          </SizeGuideLink>

          {message && (
            <Callout variant={status === "PAID" ? "success" : status === "CANCELED" ? "error" : "warning"}>
              {message}
            </Callout>
          )}

          <Form noValidate onSubmit={handleSubmit}>
            <FormField label={t("tshirt.form.nameLabel")} htmlFor="tshirt-name" error={errors.name} required>
              <Input
                id="tshirt-name"
                name="tshirt-name"
                type="text"
                value={name}
                placeholder={t("tshirt.form.namePlaceholder")}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                autoComplete="name"
              />
            </FormField>

            <FormField label={t("tshirt.form.cpfLabel")} htmlFor="tshirt-cpf" error={errors.cpf} required>
              <Input
                id="tshirt-cpf"
                name="tshirt-cpf"
                type="text"
                value={cpf}
                placeholder={t("tshirt.form.cpfPlaceholder")}
                inputMode="numeric"
                autoComplete="off"
                onChange={(event) => {
                  setCpf(formatCpfBR(event.target.value));
                  setErrors((prev) => ({ ...prev, cpf: undefined }));
                }}
              />
            </FormField>

            <QuantityGrid>
              {SIZE_KEYS.map((sizeKey) => (
                <QuantityField key={sizeKey} htmlFor={`qty-${sizeKey.toLowerCase()}`}>
                  {t("tshirt.form.sizeLabel", { size: sizeKey })}
                  <Input
                    id={`qty-${sizeKey.toLowerCase()}`}
                    name={`qty-${sizeKey.toLowerCase()}`}
                    type="number"
                    min={0}
                    step={1}
                    value={sizes[sizeKey]}
                    onChange={(event) => handleQuantityChange(sizeKey, event.target.value)}
                  />
                </QuantityField>
              ))}
            </QuantityGrid>

            {errors.quantities && (
              <ErrorText role="alert" aria-live="assertive">
                {errors.quantities}
              </ErrorText>
            )}

            <Summary>
              {t("tshirt.form.summary", {
                quantity: totalQuantity,
                amount: formatCurrencyBRL(totalAmountCents),
              })}
            </Summary>

            <Actions>
              <TrackedButton
                pageName="landing"
                ctaId={LANDING_CTAS.TSHIRT_BUY}
                sectionId={LANDING_SECTIONS.TSHIRT_PURCHASE.id}
                sectionName={LANDING_SECTIONS.TSHIRT_PURCHASE.name}
                position={LANDING_SECTIONS.TSHIRT_PURCHASE.position}
                variant="primary"
                size="md"
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? t("tshirt.form.loading") : t("tshirt.form.submit")}
              </TrackedButton>

              <TrackedButton
                pageName="landing"
                ctaId={LANDING_CTAS.TSHIRT_CHECK_STATUS}
                sectionId={LANDING_SECTIONS.TSHIRT_PURCHASE.id}
                sectionName={LANDING_SECTIONS.TSHIRT_PURCHASE.name}
                position={LANDING_SECTIONS.TSHIRT_PURCHASE.position}
                variant="secondary"
                size="md"
                type="button"
                loading={isChecking}
                disabled={isChecking}
                onClick={handleCheckStatus}
              >
                {isChecking ? t("tshirt.form.checkLoading") : t("tshirt.form.check")}
              </TrackedButton>
            </Actions>
          </Form>

          {status === "PENDING" && (
            <PixBox>
              <PixLabelContainer>
                <PixLabel htmlFor="tshirt-pix-code">{t("tshirt.status.pixCopyLabel")}</PixLabel>
                <CopyButton type="button" onClick={handleCopyBrcode}>
                  <span>{copiedBrcode ? "✓" : "📋"}</span>
                  <span>{copiedBrcode ? t("tshirt.status.copyCopied") : t("tshirt.status.copyAction")}</span>
                </CopyButton>
              </PixLabelContainer>

              <PixTextarea
                id="tshirt-pix-code"
                readOnly
                value={qrCodeText ?? (t("tshirt.status.pixPendingPlaceholder") as string)}
              />

              {qrCodeImageUrl && (
                <QRCodeContainer>
                  <QRCodeImage src={qrCodeImageUrl} alt={t("tshirt.status.qrCodeAlt")} />
                </QRCodeContainer>
              )}
            </PixBox>
          )}

          {status === "PAID" && paidTotals && (
            <Callout variant="success">
              <strong>{t("tshirt.status.totalTitle")}</strong>
              <TotalsList>
                <li>{t("tshirt.status.totalLine", { size: "P", quantity: paidTotals.P })}</li>
                <li>{t("tshirt.status.totalLine", { size: "M", quantity: paidTotals.M })}</li>
                <li>{t("tshirt.status.totalLine", { size: "G", quantity: paidTotals.G })}</li>
                <li>{t("tshirt.status.totalLine", { size: "GG", quantity: paidTotals.GG })}</li>
                <li>
                  {t("tshirt.status.totalAmount", {
                    quantity: paidTotals.totalQuantity,
                    amount: formatCurrencyBRL(paidTotals.amountCents),
                  })}
                </li>
              </TotalsList>
            </Callout>
          )}

          {(status === "PAID" || status === "CANCELED") && (
            <Actions>
              <TrackedButton
                pageName="landing"
                ctaId={LANDING_CTAS.TSHIRT_BUY}
                sectionId={LANDING_SECTIONS.TSHIRT_PURCHASE.id}
                sectionName={LANDING_SECTIONS.TSHIRT_PURCHASE.name}
                position={LANDING_SECTIONS.TSHIRT_PURCHASE.position}
                variant="primary"
                size="md"
                type="button"
                onClick={handleStartNewPurchase}
              >
                {t("tshirt.form.buyMore")}
              </TrackedButton>
            </Actions>
          )}
        </TshirtCard>
      </Container>
    </TshirtSectionWrapper>
  );
};

export default TshirtPurchaseSection;
