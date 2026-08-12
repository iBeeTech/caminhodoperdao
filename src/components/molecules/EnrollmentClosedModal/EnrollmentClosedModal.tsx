import React from "react";
import {
  Actions,
  CloseButton,
  Dialog,
  Intro,
  Overlay,
  PrimaryButton,
  Title,
} from "../InfoModal/InfoModal.styles";

/**
 * "As inscrições estão encerradas" — o que o botão de inscrição abre quando a
 * flag `enrollment` está desligada.
 *
 * Existe para o botão não mentir. Antes ele levava ao login, e a pessoa
 * descobria que não dava para entrar depois de digitar e-mail e senha — ou
 * pior, criava conta e ficava esperando um e-mail de confirmação que não vinha.
 *
 * Reaproveita o vestuário do `InfoModal` de propósito: são a mesma janela para
 * quem olha, e duplicar os estilos faria as duas divergirem no primeiro ajuste.
 */

interface EnrollmentClosedModalProps {
  open: boolean;
  onClose: () => void;
}

const EnrollmentClosedModal: React.FC<EnrollmentClosedModalProps> = ({ open, onClose }) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Overlay onClick={onClose}>
      <Dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrollment-closed-title"
        tabIndex={-1}
        onClick={event => event.stopPropagation()}
      >
        <CloseButton type="button" aria-label="Fechar" onClick={onClose}>
          ×
        </CloseButton>

        <Title id="enrollment-closed-title">As inscrições estão encerradas</Title>

        <Intro>
          Não é possível se inscrever nem criar conta no momento. Quando as inscrições da
          próxima edição abrirem, avisamos aqui no site e nas redes da Caminhada.
        </Intro>

        <Actions>
          <PrimaryButton type="button" onClick={onClose}>
            Entendi
          </PrimaryButton>
        </Actions>
      </Dialog>
    </Overlay>
  );
};

export default EnrollmentClosedModal;
