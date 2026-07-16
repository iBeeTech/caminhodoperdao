import React from "react";
import { useTranslation } from "react-i18next";
import { Callout, FormField, Input } from "../../../../../components";
import { useSectionView } from "../../../../../hooks/useSectionView";
import { LANDING_SECTIONS } from "../../../../../utils/analytics/catalog/sections";
import { landingService } from "../../../../../services/landing/landing.service";
import { canonicalizeCpf, isValidCpf } from "../../../../../utils/validators/cpf";
import { formatCpfBR } from "../../../../../utils/formatters/cpf";
import type {
  TshirtSizes,
  TshirtStatusResponse,
} from "../../../../../services/landing/landing.types";
import {
  Container,
  FieldHint,
  Header,
  OrderDescription,
  OrderHeader,
  OrderHeaderText,
  OrderItem,
  OrderMeta,
  OrderNote,
  OrdersList,
  OrdersTitle,
  StatusBadge,
  TshirtCard,
  TshirtSectionWrapper,
} from "./TshirtPurchaseSection.styles";

const SIZE_KEYS: (keyof TshirtSizes)[] = ["P", "M", "G", "GG"];

/** Pedido que ainda dá para cancelar (pendente ou pago). */
interface CancelableOrder {
  id: string;
  status: "pending" | "paid";
  sizes: TshirtSizes;
  amountCents: number;
}

const formatBRL = (cents: number) =>
  (Math.max(0, cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * As vendas foram encerradas (commit 2852ff4), mas quem já comprou precisa
 * conseguir cancelar: aquele commit removeu a seção inteira e levou junto a
 * única tela de cancelamento, deixando os pedidos pagos sem saída pelo site.
 * Aqui fica só consulta + cancelamento — nada de compra nova.
 */
const TshirtPurchaseSection: React.FC = () => {
  const { t } = useTranslation("landing");

  const sectionViewRef = useSectionView({
    pageName: "landing",
    sectionId: LANDING_SECTIONS.TSHIRT_PURCHASE.id,
    sectionName: LANDING_SECTIONS.TSHIRT_PURCHASE.name,
    position: LANDING_SECTIONS.TSHIRT_PURCHASE.position,
  });

  const [cpf, setCpf] = React.useState("");
  const [orders, setOrders] = React.useState<CancelableOrder[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Pedido em confirmação. null = modal fechado.
  const [confirming, setConfirming] = React.useState<CancelableOrder | null>(null);
  const [refundPixKey, setRefundPixKey] = React.useState("");
  const [isCanceling, setIsCanceling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  // Esc fecha o diálogo (menos durante o cancelamento em voo).
  React.useEffect(() => {
    if (!confirming) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCanceling) setConfirming(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirming, isCanceling]);

  const describeSizes = (sizes: TshirtSizes): string =>
    SIZE_KEYS.filter(key => sizes[key] > 0)
      .map(key => {
        const quantity = sizes[key];
        const noun =
          quantity === 1 ? t("tshirt.orders.shirtSingular") : t("tshirt.orders.shirtPlural");
        return `${quantity} ${noun} ${key}`;
      })
      .join(", ");

  const applyState = (result: TshirtStatusResponse) => {
    const pending = (result.pendingPurchases ?? []).map(
      (p): CancelableOrder => ({ id: p.id, status: "pending", sizes: p.sizes, amountCents: p.amountCents })
    );
    const paid = (result.paidPurchases ?? []).map(
      (p): CancelableOrder => ({ id: p.id, status: "paid", sizes: p.sizes, amountCents: p.amountCents })
    );
    // Cancelados ficam de fora: não há o que cancelar neles.
    setOrders([...pending, ...paid]);
  };

  const loadOrders = async (normalizedCpf: string) => {
    const result = await landingService.checkTshirtStatus(normalizedCpf);
    if (result.exists) applyState(result);
    else setOrders([]);
  };

  const handleSearch = async () => {
    const normalizedCpf = canonicalizeCpf(cpf);
    if (!isValidCpf(normalizedCpf)) {
      setMessage(t("tshirt.errors.invalidCpf"));
      setOrders(null);
      return;
    }
    setIsLoading(true);
    setMessage(null);
    setSuccess(null);
    try {
      await loadOrders(normalizedCpf);
    } catch {
      setMessage(t("tshirt.orders.cancelError"));
      setOrders(null);
    } finally {
      setIsLoading(false);
    }
  };

  const openConfirm = (order: CancelableOrder) => {
    setCancelError(null);
    setRefundPixKey("");
    setConfirming(order);
  };

  const confirmCancel = async () => {
    if (!confirming) return;
    const normalizedCpf = canonicalizeCpf(cpf);
    setIsCanceling(true);
    setCancelError(null);
    try {
      await landingService.cancelTshirt(
        normalizedCpf,
        confirming.id,
        // Chave só serve em pedido pago: pendente não gera estorno.
        confirming.status === "paid" ? refundPixKey.trim() || undefined : undefined
      );
      setConfirming(null);
      setSuccess(t("tshirt.cancelSection.done"));
      await loadOrders(normalizedCpf);
    } catch {
      setCancelError(t("tshirt.orders.cancelError"));
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <TshirtSectionWrapper id="tshirt-purchase" ref={sectionViewRef}>
      <Container>
        <TshirtCard>
          <Header>
            <h2>{t("tshirt.closed.title")}</h2>
          </Header>
          <Callout variant="info">{t("tshirt.closed.message")}</Callout>

          <OrdersTitle>{t("tshirt.cancelSection.title")}</OrdersTitle>
          <FieldHint>{t("tshirt.cancelSection.help")}</FieldHint>

          <form
            onSubmit={event => {
              event.preventDefault();
              handleSearch();
            }}
          >
            <FormField label={t("tshirt.form.cpfLabel")} htmlFor="tshirt-cancel-cpf">
              <Input
                id="tshirt-cancel-cpf"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={event => setCpf(formatCpfBR(event.target.value))}
                placeholder={t("tshirt.form.cpfPlaceholder")}
                autoComplete="off"
              />
            </FormField>
            <button type="submit" disabled={isLoading} style={styles.searchButton}>
              {isLoading ? t("tshirt.cancelSection.searching") : t("tshirt.cancelSection.search")}
            </button>
          </form>

          {message && (
            <div style={{ marginTop: "1rem" }}>
              <Callout variant="warning">{message}</Callout>
            </div>
          )}
          {success && (
            <div style={{ marginTop: "1rem" }}>
              <Callout variant="info">{success}</Callout>
            </div>
          )}

          {orders !== null && orders.length === 0 && !message && (
            <div style={{ marginTop: "1rem" }}>
              <Callout variant="info">{t("tshirt.cancelSection.empty")}</Callout>
            </div>
          )}

          {orders !== null && orders.length > 0 && (
            <OrdersList>
              {orders.map(order => (
                <OrderItem key={order.id}>
                  <OrderHeader>
                    <OrderHeaderText>
                      <OrderDescription>{describeSizes(order.sizes)}</OrderDescription>
                      <OrderMeta>{formatBRL(order.amountCents)}</OrderMeta>
                    </OrderHeaderText>
                    <StatusBadge $status={order.status}>
                      {t(`tshirt.orders.status.${order.status}`)}
                    </StatusBadge>
                  </OrderHeader>
                  {/* Notas próprias: as de tshirt.orders falam do "PIX abaixo",
                      que era o QR da tela de compra e não existe mais aqui. */}
                  <OrderNote>
                    {order.status === "paid"
                      ? t("tshirt.cancelSection.paidNote")
                      : t("tshirt.cancelSection.pendingNote")}
                  </OrderNote>
                  <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
                    <button type="button" onClick={() => openConfirm(order)} style={styles.cancelButton}>
                      {t("tshirt.orders.cancelPurchase")}
                    </button>
                  </div>
                </OrderItem>
              ))}
            </OrdersList>
          )}
        </TshirtCard>
      </Container>

      {confirming && (
        <div
          style={styles.overlay}
          role="presentation"
          // Fecha só no clique no fundo. Comparar target/currentTarget evita
          // precisar de stopPropagation no diálogo (que o eslint-jsx-a11y
          // barra por pôr handler de mouse em elemento não interativo).
          onClick={event => {
            if (event.target === event.currentTarget && !isCanceling) setConfirming(null);
          }}
        >
          <form
            style={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tshirt-cancel-title"
            onSubmit={event => {
              event.preventDefault();
              confirmCancel();
            }}
          >
            <h3 id="tshirt-cancel-title" style={styles.dialogTitle}>
              {t("tshirt.orders.cancelConfirm")}
            </h3>
            <p style={styles.dialogText}>{describeSizes(confirming.sizes)}</p>

            {/* Só pedido pago gera estorno; pendente é só invalidar o PIX. */}
            {confirming.status === "paid" && (
              <FormField
                label={t("cancellation.pixKeyLabel", { ns: "common" })}
                htmlFor="tshirt-refund-pix"
              >
                <Input
                  id="tshirt-refund-pix"
                  type="text"
                  value={refundPixKey}
                  onChange={event => setRefundPixKey(event.target.value)}
                  placeholder={t("cancellation.pixKeyPlaceholder", { ns: "common" })}
                  disabled={isCanceling}
                  autoComplete="off"
                />
                <FieldHint>{t("cancellation.pixKeyHint", { ns: "common" })}</FieldHint>
              </FormField>
            )}

            {cancelError && <p style={styles.dialogError}>{cancelError}</p>}

            <div style={styles.dialogActions}>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={isCanceling}
                style={styles.dialogSecondary}
              >
                {t("cancellation.exit", { ns: "common" })}
              </button>
              <button type="submit" disabled={isCanceling} style={styles.dialogPrimary}>
                {isCanceling
                  ? t("tshirt.orders.canceling")
                  : t("cancellation.confirm", { ns: "common" })}
              </button>
            </div>
          </form>
        </div>
      )}
    </TshirtSectionWrapper>
  );
};

const styles: Record<string, React.CSSProperties> = {
  searchButton: {
    marginTop: "0.75rem",
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: 10,
    border: "1px solid #1f7a3d",
    background: "#1f7a3d",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    font: "inherit",
  },
  cancelButton: {
    cursor: "pointer",
    color: "#b91c1c",
    background: "none",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "0.45rem 1rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    font: "inherit",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 100,
  },
  dialog: {
    background: "#fff",
    borderRadius: 16,
    padding: "1.75rem 1.5rem",
    width: "min(440px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.9rem",
  },
  dialogTitle: { margin: 0, fontSize: "1.15rem", color: "#1d1d1f", lineHeight: 1.4 },
  dialogText: { margin: 0, color: "#4b5563", fontSize: "0.95rem" },
  dialogError: { margin: 0, color: "#c62828", fontSize: "0.9rem" },
  dialogActions: { display: "flex", gap: "0.75rem", marginTop: "0.25rem" },
  dialogSecondary: {
    flex: 1,
    padding: "0.7rem 1rem",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    fontWeight: 600,
    cursor: "pointer",
    font: "inherit",
  },
  dialogPrimary: {
    flex: 1,
    padding: "0.7rem 1rem",
    borderRadius: 10,
    border: "1px solid #b91c1c",
    background: "#b91c1c",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    font: "inherit",
  },
};

export default TshirtPurchaseSection;
