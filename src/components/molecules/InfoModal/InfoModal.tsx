import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  Actions,
  CloseButton,
  Dialog,
  Intro,
  Item,
  ItemBody,
  ItemDesc,
  ItemIcon,
  ItemTitle,
  List,
  Overlay,
  PrimaryButton,
  Title,
  WhatsAppButton,
} from "./InfoModal.styles";

const WA_NUMBER = "5516982221415";

const ITEM_KEYS = [
  "cpfRule",
  "paymentDeadline",
  "paymentReceipt",
  "tshirtSeparate",
  "tshirtCancel",
] as const;

const InfoModal: React.FC = () => {
  const { t } = useTranslation("common");
  const location = useLocation();
  const isRootRoute = location.pathname === "/";
  const [open, setOpen] = React.useState(true);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    if (!open || !isRootRoute) return;

    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isRootRoute, close]);

  if (!open || !isRootRoute) return null;

  const whatsappUrl = `https://api.whatsapp.com/send/?phone=${WA_NUMBER}&text=${encodeURIComponent(
    t("infoModal.whatsappMessage")
  )}&type=phone_number&app_absent=0`;

  return (
    <Overlay onClick={close}>
      <Dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <CloseButton type="button" onClick={close} aria-label={t("infoModal.close")}>
          ×
        </CloseButton>

        <Title id="info-modal-title">{t("infoModal.title")}</Title>
        <Intro>{t("infoModal.intro")}</Intro>

        <List>
          {ITEM_KEYS.map((key) => (
            <Item key={key}>
              <ItemIcon aria-hidden="true">✓</ItemIcon>
              <ItemBody>
                <ItemTitle>{t(`infoModal.items.${key}.title`)}</ItemTitle>
                <ItemDesc>{t(`infoModal.items.${key}.desc`)}</ItemDesc>
              </ItemBody>
            </Item>
          ))}
        </List>

        <Actions>
          <WhatsAppButton
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("infoModal.whatsapp")}
          </WhatsAppButton>
          <PrimaryButton type="button" onClick={close}>
            {t("infoModal.understood")}
          </PrimaryButton>
        </Actions>
      </Dialog>
    </Overlay>
  );
};

export default InfoModal;
