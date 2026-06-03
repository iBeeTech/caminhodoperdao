import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Callout, FormField, Input } from "../../../../../components";
import { CalloutVariant } from "../../../../../components/molecules/Callout/Callout";
import TrackedButton from "../../../../../components/analytics/TrackedButton";
import { useAnalytics } from "../../../../../hooks/useAnalytics";
import { useSectionView } from "../../../../../hooks/useSectionView";
import { ErrorText } from "../../../../../components/molecules/FormField/FormField.styles";
import { HttpError } from "../../../../../services/http/client";
import { landingService } from "../../../../../services/landing/landing.service";
import {
  TshirtCanceledPurchase,
  TshirtPaidPurchase,
  TshirtPaidTotals,
  TshirtPendingPurchase,
  TshirtPurchaseResponse,
  TshirtSizes,
  TshirtStatusResponse,
} from "../../../../../services/landing/landing.types";
import { LANDING_CTAS } from "../../../../../utils/analytics/catalog/ctas";
import { LANDING_SECTIONS } from "../../../../../utils/analytics/catalog/sections";
import { formatCpfBR } from "../../../../../utils/formatters/cpf";
import { canonicalizeCpf, isValidCpf } from "../../../../../utils/validators/cpf";
import { isEmailValid } from "../../../../../utils/validators/email";
import camisetaFrente from "../../../../../assets/camiseta-frente.png";
import camisetaTras from "../../../../../assets/camiseta-tras.png";
import {
  Actions,
  Chevron,
  Container,
  CopyButton,
  FieldHint,
  Form,
  Header,
  ImageFigure,
  ImageGrid,
  OrderBody,
  OrderDescription,
  OrderHeader,
  OrderHeaderRight,
  OrderHeaderText,
  OrderItem,
  OrderMeta,
  OrderNote,
  OrdersList,
  OrdersTitle,
  PixLabel,
  PixLabelContainer,
  PixTextarea,
  QRCodeContainer,
  QRCodeImage,
  QuantityField,
  QuantityGrid,
  SizeGuideLink,
  SizeGuideModalOverlay,
  SizeGuideModalContent,
  SizeGuideClose,
  SizeTable,
  StatusBadge,
  Summary,
  TotalsList,
  TshirtCard,
  TshirtImage,
  TshirtImageButton,
  TshirtSectionWrapper,
  ZoomModalOverlay,
  ZoomModalContent,
  ZoomImage,
  ZoomCaption,
  ZoomClose,
} from "./TshirtPurchaseSection.styles";

type TshirtErrorKey = "name" | "email" | "cpf" | "quantities";
type TshirtErrors = Partial<Record<TshirtErrorKey, string>>;

const DEFAULT_PRICE_PER_TSHIRT_CENTS = 10_000;
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

function formatOrderId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function formatDateBR(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

type OrderStatus = "PENDING" | "PAID" | "CANCELED";

interface UnifiedOrder {
  id: string;
  status: OrderStatus;
  sizes: TshirtSizes;
  totalQuantity: number;
  amountCents: number;
  createdAt: string;
  statusDate: string | null;
  qrCodeText?: string | null;
  qrCodeImageUrl?: string | null;
}

const TshirtPurchaseSection: React.FC = () => {
  const { t } = useTranslation("landing");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [sizes, setSizes] = useState<TshirtSizes>({ P: 0, M: 0, G: 0, GG: 0 });
  const [pricePerUnitCents, setPricePerUnitCents] = useState<number>(
    DEFAULT_PRICE_PER_TSHIRT_CENTS
  );
  const [errors, setErrors] = useState<TshirtErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<CalloutVariant>("warning");
  const [pendingPurchases, setPendingPurchases] = useState<TshirtPendingPurchase[]>([]);
  const [canceledPurchases, setCanceledPurchases] = useState<TshirtCanceledPurchase[]>([]);
  const [paidPurchases, setPaidPurchases] = useState<TshirtPaidPurchase[]>([]);
  const [paidTotals, setPaidTotals] = useState<TshirtPaidTotals | null>(null);
  const [openOrders, setOpenOrders] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const { paymentConfirmed } = useAnalytics();

  // Rastreia a visualização da seção (Amplitude: section_viewed), igual às demais seções.
  const sectionViewRef = useSectionView({
    pageName: "landing",
    sectionId: LANDING_SECTIONS.TSHIRT_PURCHASE.id,
    sectionName: LANDING_SECTIONS.TSHIRT_PURCHASE.name,
    position: LANDING_SECTIONS.TSHIRT_PURCHASE.position,
  });

  // Une a ref de scroll (handleStartNewPurchase) com a ref do observer de section_view.
  const setSectionRef = useCallback(
    (node: HTMLElement | null) => {
      sectionRef.current = node;
      (sectionViewRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    [sectionViewRef]
  );

  // Pedidos vistos como pendentes nesta sessão e pedidos já reportados como pagos,
  // para disparar a conversão (payment_confirmed) só na transição PENDING -> PAID
  // e uma única vez por pedido.
  const seenPendingRef = useRef<Set<string>>(new Set());
  const reportedPaidRef = useRef<Set<string>>(new Set());

  const totalQuantity = useMemo(
    () => sizes.P + sizes.M + sizes.G + sizes.GG,
    [sizes.G, sizes.GG, sizes.M, sizes.P]
  );

  const totalAmountCents = useMemo(
    () => totalQuantity * pricePerUnitCents,
    [totalQuantity, pricePerUnitCents]
  );

  // Busca o preço unitário configurado no backend (env TSHIRT_COST). Mantém o
  // valor padrão caso a requisição falhe.
  useEffect(() => {
    let active = true;
    landingService
      .getTshirtConfig()
      .then((config) => {
        if (active && typeof config.pricePerUnitCents === "number") {
          setPricePerUnitCents(config.pricePerUnitCents);
        }
      })
      .catch(() => {
        /* mantém o valor padrão */
      });
    return () => {
      active = false;
    };
  }, []);

  const hasPending = pendingPurchases.length > 0;

  const orders = useMemo<UnifiedOrder[]>(() => {
    const list: UnifiedOrder[] = [
      ...pendingPurchases.map<UnifiedOrder>((p) => ({
        id: p.id,
        status: "PENDING",
        sizes: p.sizes,
        totalQuantity: p.totalQuantity,
        amountCents: p.amountCents,
        createdAt: p.createdAt,
        statusDate: null,
        qrCodeText: p.qrCodeText,
        qrCodeImageUrl: p.qrCodeImageUrl,
      })),
      ...paidPurchases.map<UnifiedOrder>((p) => ({
        id: p.id,
        status: "PAID",
        sizes: p.sizes,
        totalQuantity: p.totalQuantity,
        amountCents: p.amountCents,
        createdAt: p.createdAt,
        statusDate: p.paidAt,
      })),
      ...canceledPurchases.map<UnifiedOrder>((p) => ({
        id: p.id,
        status: "CANCELED",
        sizes: p.sizes,
        totalQuantity: p.totalQuantity,
        amountCents: p.amountCents,
        createdAt: p.createdAt,
        statusDate: p.canceledAt,
      })),
    ];
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [pendingPurchases, paidPurchases, canceledPurchases]);

  const hasPaidTotals = (paidTotals?.totalQuantity ?? 0) > 0;
  const hasAnyResult = orders.length > 0;
  const isCollapsible = orders.length > 1;

  const applyState = useCallback(
    (result: TshirtStatusResponse | TshirtPurchaseResponse) => {
      if (typeof result.pricePerUnitCents === "number") {
        setPricePerUnitCents(result.pricePerUnitCents);
      }

      const pending = result.pendingPurchases ?? [];
      const canceled = result.canceledPurchases ?? [];
      const paid = result.paidPurchases ?? [];
      setPendingPurchases(pending);
      setCanceledPurchases(canceled);
      setPaidPurchases(paid);
      setPaidTotals(result.paidTotals ?? null);

      // Define o estado de expansão apenas para pedidos novos, preservando o
      // que o usuário já abriu/fechou manualmente entre os polls de status.
      // Com mais de um pedido, todos começam fechados.
      const isSingle = pending.length + canceled.length + paid.length === 1;
      setOpenOrders((prev) => {
        const next = { ...prev };
        [...pending, ...paid, ...canceled].forEach((o) => {
          if (!(o.id in next)) next[o.id] = isSingle;
        });
        return next;
      });
    },
    []
  );

  const clearResults = () => {
    setPendingPurchases([]);
    setCanceledPurchases([]);
    setPaidPurchases([]);
    setPaidTotals(null);
    setOpenOrders({});
  };

  const toggleOrder = (id: string) => {
    if (!isCollapsible) return;
    setOpenOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const describeSizes = (sizes: TshirtSizes): string =>
    SIZE_KEYS.filter((key) => sizes[key] > 0)
      .map((key) => {
        const quantity = sizes[key];
        const noun =
          quantity === 1
            ? t("tshirt.orders.shirtSingular")
            : t("tshirt.orders.shirtPlural");
        return `${quantity} ${noun} ${key}`;
      })
      .join(", ");

  const showMessage = (text: string, variant: CalloutVariant = "warning") => {
    setMessage(text);
    setMessageVariant(variant);
  };

  // Cancela UMA compra (pendente ou paga). Paga gera estorno no /admin/estorno.
  const handleCancelPurchase = async (orderId: string) => {
    const normalizedCpf = canonicalizeCpf(cpf);
    const normalizedName = normalizeName(name);
    if (!normalizedCpf) return;
    if (typeof window !== "undefined" && !window.confirm(t("tshirt.orders.cancelConfirm"))) {
      return;
    }
    setCancelingId(orderId);
    try {
      await landingService.cancelTshirt(normalizedCpf, orderId);
      // Recarrega os pedidos (apenas por CPF) para refletir o cancelamento.
      const result = await landingService.checkTshirtStatus(normalizedCpf, normalizedName || undefined);
      if (result.exists) applyState(result);
    } catch {
      showMessage(t("tshirt.orders.cancelError"), "warning");
    } finally {
      setCancelingId(null);
    }
  };

  React.useEffect(() => {
    if (!hasPending) return;

    const normalizedCpf = canonicalizeCpf(cpf);
    const normalizedName = normalizeName(name);
    if (!normalizedCpf) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const result = await landingService.checkTshirtStatus(normalizedCpf, normalizedName || undefined);
        if (cancelled || !result.exists) return;

        applyState(result);
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
  }, [hasPending, cpf, name, applyState]);

  // Memoriza os pedidos que apareceram como pendentes nesta sessão.
  useEffect(() => {
    pendingPurchases.forEach((p) => seenPendingRef.current.add(p.id));
  }, [pendingPurchases]);

  // Dispara o evento de conversão (payment_confirmed) quando um pedido que estava
  // pendente nesta sessão passa para pago. Pagamentos históricos exibidos na consulta
  // de status (que nunca foram vistos como pendentes aqui) são ignorados.
  useEffect(() => {
    paidPurchases.forEach((p) => {
      if (reportedPaidRef.current.has(p.id)) return;
      if (!seenPendingRef.current.has(p.id)) return;

      reportedPaidRef.current.add(p.id);
      paymentConfirmed("landing", "woovi", "pix", {
        status: "PAID",
        product: "tshirt",
        order_id: p.id,
        quantity: p.totalQuantity,
        amount_cents: p.amountCents,
        section_id: LANDING_SECTIONS.TSHIRT_PURCHASE.id,
        section_name: LANDING_SECTIONS.TSHIRT_PURCHASE.name,
      });
    });
  }, [paidPurchases, paymentConfirmed]);

  const validateForm = (): TshirtErrors => {
    const nextErrors: TshirtErrors = {};

    if (!normalizeName(name)) {
      nextErrors.name = t("tshirt.errors.required");
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      nextErrors.email = t("tshirt.errors.required");
    } else if (!isEmailValid(trimmedEmail)) {
      nextErrors.email = t("tshirt.errors.invalidEmail");
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
      showMessage(t(fallbackKey), "error");
      return;
    }

    const payload =
      (error.body as { error?: string; linkedName?: string } | undefined) ?? {};

    if (payload.error === "cpf_used_by_other_name") {
      const linkedName =
        typeof payload.linkedName === "string" ? payload.linkedName.trim() : "";
      showMessage(
        linkedName
          ? t("tshirt.errors.cpfUsedByOtherNameNamed", { name: linkedName })
          : t("tshirt.errors.cpfUsedByOtherName"),
        "error"
      );
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

    if (payload.error === "email_required") {
      setErrors((prev) => ({ ...prev, email: t("tshirt.errors.required") }));
      return;
    }

    if (payload.error === "invalid_email") {
      setErrors((prev) => ({ ...prev, email: t("tshirt.errors.invalidEmail") }));
      return;
    }

    if (payload.error === "quantity_required" || payload.error === "invalid_quantity") {
      setErrors((prev) => ({ ...prev, quantities: t("tshirt.errors.quantityRequired") }));
      return;
    }

    if (payload.error === "payment_provider_not_configured") {
      showMessage(t("tshirt.status.paymentConfigError"), "error");
      return;
    }

    if (payload.error === "pix_creation_failed") {
      showMessage(t("tshirt.status.pixError"), "error");
      return;
    }

    showMessage(t(fallbackKey), "error");
  };

  const handleQuantityChange = (size: keyof TshirtSizes, rawValue: string) => {
    const value = Number(rawValue);
    const normalized = Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;

    setSizes((prev) => ({ ...prev, [size]: normalized }));
    setErrors((prev) => ({ ...prev, quantities: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

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
        email: email.trim().toLowerCase(),
        cpf: normalizedCpf,
        sizes,
      });
      applyState(result);
      setSizes({ P: 0, M: 0, G: 0, GG: 0 });
    } catch (error) {
      handleApiError(error, "tshirt.status.submitError");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    const normalizedCpf = canonicalizeCpf(cpf);
    const normalizedName = normalizeName(name);

    // Consulta de pedidos exige apenas o CPF.
    const nextErrors: TshirtErrors = {};
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
    setMessage(null);

    try {
      const result = await landingService.checkTshirtStatus(normalizedCpf, normalizedName || undefined);

      if (!result.exists) {
        clearResults();
        showMessage(t("tshirt.status.notFound"), "warning");
        return;
      }

      applyState(result);
    } catch (error) {
      handleApiError(error, "tshirt.status.checkError");
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopyBrcode = async (qrCodeText: string | null, purchaseId: string) => {
    if (!qrCodeText) return;

    try {
      await navigator.clipboard.writeText(qrCodeText);
      setCopiedId(purchaseId);
      setTimeout(() => setCopiedId((current) => (current === purchaseId ? null : current)), 1800);
    } catch {
      showMessage(t("tshirt.status.copyError"), "error");
    }
  };

  const handleStartNewPurchase = () => {
    setSizes({ P: 0, M: 0, G: 0, GG: 0 });
    setErrors({});
    setMessage(null);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <TshirtSectionWrapper id="tshirt-purchase" ref={setSectionRef}>
      <Container>
        <TshirtCard>
          <Header>
            <h2>
              {t("tshirt.title")}{" "}
              <span style={{ color: "#dc2626", fontSize: "0.7em", fontWeight: 600 }}>
                {t("tshirt.titleNote")}
              </span>
            </h2>
            <p>{t("tshirt.description")}</p>
          </Header>

          <ImageGrid>
            <ImageFigure>
              <TshirtImageButton
                type="button"
                onClick={() =>
                  setZoomedImage({ src: camisetaFrente, alt: t("tshirt.images.frontAlt") })
                }
                aria-label={t("tshirt.images.zoomAria", { side: t("tshirt.images.frontCaption") })}
              >
                <TshirtImage src={camisetaFrente} alt={t("tshirt.images.frontAlt")} loading="lazy" />
              </TshirtImageButton>
              <figcaption>{t("tshirt.images.frontCaption")}</figcaption>
            </ImageFigure>
            <ImageFigure>
              <TshirtImageButton
                type="button"
                onClick={() =>
                  setZoomedImage({ src: camisetaTras, alt: t("tshirt.images.backAlt") })
                }
                aria-label={t("tshirt.images.zoomAria", { side: t("tshirt.images.backCaption") })}
              >
                <TshirtImage src={camisetaTras} alt={t("tshirt.images.backAlt")} loading="lazy" />
              </TshirtImageButton>
              <figcaption>{t("tshirt.images.backCaption")}</figcaption>
            </ImageFigure>
          </ImageGrid>

          {zoomedImage && (
            <ZoomModalOverlay
              role="dialog"
              aria-modal="true"
              aria-label={zoomedImage.alt}
              onClick={() => setZoomedImage(null)}
            >
              <ZoomModalContent onClick={(e) => e.stopPropagation()}>
                <ZoomClose
                  type="button"
                  aria-label={t("tshirt.images.zoomClose")}
                  onClick={() => setZoomedImage(null)}
                >
                  ×
                </ZoomClose>
                <ZoomImage src={zoomedImage.src} alt={zoomedImage.alt} />
                <ZoomCaption>{zoomedImage.alt}</ZoomCaption>
              </ZoomModalContent>
            </ZoomModalOverlay>
          )}

          <SizeGuideLink type="button" onClick={() => setShowSizeGuide(true)}>
            {t("tshirt.sizeGuideLink")}
          </SizeGuideLink>

          {showSizeGuide && (
            <SizeGuideModalOverlay onClick={() => setShowSizeGuide(false)}>
              <SizeGuideModalContent onClick={(e) => e.stopPropagation()}>
                <SizeTable>
                  <caption>{t("tshirt.sizeTable.caption")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t("tshirt.sizeTable.columns.size")}</th>
                      <th scope="col">{t("tshirt.sizeTable.columns.chest")}</th>
                      <th scope="col">{t("tshirt.sizeTable.columns.width")}</th>
                      <th scope="col">{t("tshirt.sizeTable.columns.length")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SIZE_KEYS.map((sizeKey) => (
                      <tr key={sizeKey}>
                        <th scope="row">{sizeKey}</th>
                        <td>{t(`tshirt.sizeTable.rows.${sizeKey}.chest`)}</td>
                        <td>{t(`tshirt.sizeTable.rows.${sizeKey}.width`)}</td>
                        <td>{t(`tshirt.sizeTable.rows.${sizeKey}.length`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </SizeTable>
                <SizeGuideClose onClick={() => setShowSizeGuide(false)}>
                  {t("tshirt.sizeTable.close")}
                </SizeGuideClose>
              </SizeGuideModalContent>
            </SizeGuideModalOverlay>
          )}

          {message && <Callout variant={messageVariant}>{message}</Callout>}

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

            <FormField
              label={t("tshirt.form.emailLabel")}
              htmlFor="tshirt-email"
              error={errors.email}
              required
            >
              <Input
                id="tshirt-email"
                name="tshirt-email"
                type="email"
                value={email}
                placeholder={t("tshirt.form.emailPlaceholder")}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                autoComplete="email"
                inputMode="email"
              />
            </FormField>
            {!errors.email && (
              <FieldHint>{t("tshirt.form.emailHint")}</FieldHint>
            )}

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
                disabled={isSubmitting || totalQuantity <= 0}
              >
                {isSubmitting ? t("tshirt.form.loading") : t("tshirt.form.submit")}
              </TrackedButton>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <TrackedButton
                  pageName="landing"
                  ctaId={LANDING_CTAS.TSHIRT_CHECK_STATUS}
                  sectionId={LANDING_SECTIONS.TSHIRT_PURCHASE.id}
                  sectionName={LANDING_SECTIONS.TSHIRT_PURCHASE.name}
                  position={LANDING_SECTIONS.TSHIRT_PURCHASE.position}
                  variant="outline"
                  size="md"
                  type="button"
                  loading={isChecking}
                  disabled={isChecking}
                  onClick={handleCheckStatus}
                >
                  {isChecking ? t("tshirt.form.checkLoading") : t("tshirt.form.check")}
                </TrackedButton>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#6b7280",
                    textAlign: "center",
                    maxWidth: 260,
                  }}
                >
                  {t("tshirt.form.checkHint")}
                </span>
              </div>
            </Actions>
          </Form>

          {hasAnyResult && (
            <>
              <OrdersTitle>
                {orders.length > 1
                  ? t("tshirt.orders.titlePlural", { count: orders.length })
                  : t("tshirt.orders.titleSingular")}
              </OrdersTitle>

              <OrdersList>
                {orders.map((order) => {
                  const isOpen = isCollapsible ? !!openOrders[order.id] : true;
                  const statusVariant =
                    order.status === "PAID"
                      ? "paid"
                      : order.status === "CANCELED"
                      ? "canceled"
                      : "pending";
                  const bodyId = `tshirt-order-body-${order.id}`;

                  return (
                    <OrderItem key={order.id}>
                      <OrderHeader
                        as={isCollapsible ? "button" : "div"}
                        type={isCollapsible ? "button" : undefined}
                        $collapsible={isCollapsible}
                        aria-expanded={isCollapsible ? isOpen : undefined}
                        aria-controls={isCollapsible ? bodyId : undefined}
                        onClick={() => toggleOrder(order.id)}
                      >
                        <OrderHeaderText>
                          <OrderDescription>{describeSizes(order.sizes)}</OrderDescription>
                          <OrderMeta>
                            {t("tshirt.orders.meta", {
                              id: formatOrderId(order.id),
                              amount: formatCurrencyBRL(order.amountCents),
                            })}
                          </OrderMeta>
                        </OrderHeaderText>

                        <OrderHeaderRight>
                          <StatusBadge $status={statusVariant}>
                            {t(`tshirt.orders.status.${statusVariant}`)}
                          </StatusBadge>
                          {isCollapsible && <Chevron $open={isOpen}>▼</Chevron>}
                        </OrderHeaderRight>
                      </OrderHeader>

                      {isOpen && (
                        <OrderBody id={bodyId}>
                          {order.status === "PENDING" && (
                            <>
                              <OrderNote>{t("tshirt.orders.pendingNote")}</OrderNote>

                              <PixLabelContainer>
                                <PixLabel htmlFor={`tshirt-pix-code-${order.id}`}>
                                  {t("tshirt.status.pixCopyLabel")}
                                </PixLabel>
                                <CopyButton
                                  type="button"
                                  onClick={() =>
                                    handleCopyBrcode(order.qrCodeText ?? null, order.id)
                                  }
                                >
                                  <span>{copiedId === order.id ? "✓" : "📋"}</span>
                                  <span>
                                    {copiedId === order.id
                                      ? t("tshirt.status.copyCopied")
                                      : t("tshirt.status.copyAction")}
                                  </span>
                                </CopyButton>
                              </PixLabelContainer>

                              <PixTextarea
                                id={`tshirt-pix-code-${order.id}`}
                                readOnly
                                value={
                                  order.qrCodeText ??
                                  (t("tshirt.status.pixPendingPlaceholder") as string)
                                }
                              />

                              {order.qrCodeImageUrl && (
                                <QRCodeContainer>
                                  <QRCodeImage
                                    src={order.qrCodeImageUrl}
                                    alt={t("tshirt.status.qrCodeAlt")}
                                  />
                                </QRCodeContainer>
                              )}
                            </>
                          )}

                          {order.status === "PAID" && (
                            <OrderNote>
                              {order.statusDate
                                ? t("tshirt.orders.paidNoteDated", {
                                    date: formatDateBR(order.statusDate),
                                  })
                                : t("tshirt.orders.paidNote")}
                            </OrderNote>
                          )}

                          {order.status === "CANCELED" && (
                            <OrderNote>{t("tshirt.orders.canceledNote")}</OrderNote>
                          )}

                          {order.status !== "CANCELED" && (
                            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleCancelPurchase(order.id)}
                                disabled={cancelingId === order.id}
                                style={{
                                  cursor: cancelingId === order.id ? "default" : "pointer",
                                  color: "#b91c1c",
                                  background: "none",
                                  border: "1px solid #fecaca",
                                  borderRadius: 8,
                                  padding: "0.45rem 1rem",
                                  fontSize: "0.9rem",
                                  fontWeight: 600,
                                  font: "inherit",
                                }}
                              >
                                {cancelingId === order.id
                                  ? t("tshirt.orders.canceling")
                                  : t("tshirt.orders.cancelPurchase")}
                              </button>
                            </div>
                          )}
                        </OrderBody>
                      )}
                    </OrderItem>
                  );
                })}
              </OrdersList>
            </>
          )}

          {hasPaidTotals && paidTotals && paidPurchases.length > 1 && (
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

          {hasAnyResult && (
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
