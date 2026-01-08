import React, { useEffect } from 'react';
import styled from 'styled-components';
import { createPixCharge, getPixStatus } from '../../../services/pix/pix.service';
import { CreatePixResponse, GetPixStatusResponse } from '../../../../types/woovi';

const PixPaymentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
`;

const QRCodeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const QRCodeImage = styled.img`
  max-width: 300px;
  height: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  background-color: white;
`;

const PIXCodeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PIXCodeText = styled.div`
  background-color: white;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  word-break: break-all;
  color: #333;
`;

const CopyButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #25d366;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;

  &:hover {
    background-color: #1da853;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div<{ type: 'success' | 'error' | 'info' | 'pending' }>`
  padding: 1rem;
  border-radius: 4px;
  color: white;
  text-align: center;
  background-color: ${props => {
    switch (props.type) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'pending':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#999';
    }
  }};
`;

const ExpiresAtText = styled.p`
  font-size: 0.9rem;
  color: #666;
  margin: 0;
`;

export interface PixPaymentSectionProps {
  email: string;
  name?: string;
  amountCents: number;
  description?: string;
  onPaymentSuccess?: () => void;
}

/**
 * Componente para exibir opções de pagamento PIX
 * Permite gerar QR code, copiar PIX, e monitorar status
 */
const PixPaymentSectionComponent = (
  props: PixPaymentSectionProps
) => {
  const { email, name, amountCents, description, onPaymentSuccess } = props;
  
  const [pixData, setPixData] = React.useState<CreatePixResponse | null>(null);
  const [pixStatus, setPixStatus] = React.useState<GetPixStatusResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pollingActive, setPollingActive] = React.useState(false);
  const [copiedBrcode, setCopiedBrcode] = React.useState(false);

  // ========== CRIAR COBRANÇA PIX ==========
  const handleCreatePixCharge = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await createPixCharge({
        email,
        name,
        amountCents,
        description,
      });

      if (response.status === 'success') {
        setPixData(response);
        setError(null);
        setPollingActive(true);
      } else {
        setError(response.message || 'Erro ao gerar cobrança PIX');
      }
    } catch (err: any) {
      setError('Erro ao conectar ao servidor. Tente novamente.');
      console.error('Erro ao criar cobrança:', err);
    } finally {
      setLoading(false);
    }
  };

  // ========== COPIAR PIX ==========
  const handleCopyBrcode = async () => {
    if (!pixData?.brcode) return;

    try {
      await navigator.clipboard.writeText(pixData.brcode);
      setCopiedBrcode(true);
      setTimeout(() => setCopiedBrcode(false), 2000);
    } catch (err) {
      setError('Erro ao copiar PIX');
    }
  };

  // ========== POLLING DE STATUS ==========
  useEffect(() => {
    if (!pollingActive || !pixData?.correlationId) return;

    let pollingInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const status = await getPixStatus(email);

        if (status) {
          setPixStatus(status);

          if (status.status === 'paid') {
            setPollingActive(false);
            onPaymentSuccess?.();
          } else if (status.status === 'expired') {
            setPollingActive(false);
            setError('Cobrança expirou. Crie uma nova.');
          }
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    };

    // Primeira verificação imediata
    checkStatus();

    // Polling a cada 5 segundos
    pollingInterval = setInterval(checkStatus, 5000);

    return () => clearInterval(pollingInterval);
  }, [pollingActive, pixData?.correlationId, email, onPaymentSuccess]);

  // ========== RENDER ==========
  const isExpired = pixStatus?.expiresAt && pixStatus.expiresAt < Date.now();
  const isPaid = pixStatus?.status === 'paid';

  const renderContent = () => {
    const elements: React.ReactNode[] = [];

    elements.push(React.createElement('h3', { key: 'title' }, 'Pagamento via PIX'));

    if (error) {
      elements.push(
        React.createElement(StatusMessage, { key: 'error', type: 'error' }, error)
      );
    }

    if (!pixData && !pixStatus) {
      elements.push(
        React.createElement(
          'button',
          { key: 'create-btn', onClick: handleCreatePixCharge, disabled: loading },
          loading ? 'Gerando cobrança...' : 'Gerar QR Code PIX'
        )
      );
    }

    if (isPaid) {
      elements.push(
        React.createElement(
          StatusMessage,
          { key: 'success', type: 'success' },
          '✅ Pagamento confirmado! Obrigado pela inscrição.'
        )
      );
    }

    if (isExpired) {
      elements.push(
        React.createElement(
          React.Fragment,
          { key: 'expired-block' },
          React.createElement(
            StatusMessage,
            { type: 'error' },
            '⏰ Cobrança expirou. Gere uma nova para continuar.'
          ),
          React.createElement(
            'button',
            { onClick: handleCreatePixCharge },
            'Gerar novo QR Code'
          )
        )
      );
    }

    if (pixData && !isPaid && !isExpired) {
      const contentElements: React.ReactNode[] = [];

      if (pixStatus?.status === 'pending') {
        contentElements.push(
          React.createElement(
            StatusMessage,
            { key: 'pending', type: 'pending' },
            '⏳ Aguardando pagamento...'
          )
        );
      }

      if (pixData.expiresAt) {
        contentElements.push(
          React.createElement(
            ExpiresAtText,
            { key: 'expires' },
            `Expira em: ${new Date(pixData.expiresAt).toLocaleString('pt-BR')}`
          )
        );
      }

      const qrElements: React.ReactNode[] = [];

      if (pixData.qrCodeImage) {
        qrElements.push(
          React.createElement(QRCodeImage, {
            key: 'qr',
            src: pixData.qrCodeImage,
            alt: 'QR Code PIX',
          })
        );
      }

      if (pixData.brcode) {
        qrElements.push(
          React.createElement(
            PIXCodeContainer,
            { key: 'brcode-container' },
            React.createElement('label', { htmlFor: 'pix-brcode' }, 'Copia e Cola:'),
            React.createElement(PIXCodeText, { id: 'pix-brcode' }, pixData.brcode),
            React.createElement(
              CopyButton,
              { onClick: handleCopyBrcode },
              copiedBrcode ? '✓ Copiado!' : '📋 Copiar PIX'
            )
          )
        );
      }

      if (pixData.paymentUrl) {
        qrElements.push(
          React.createElement(
            'a',
            {
              key: 'payment-link',
              href: pixData.paymentUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
            'Ou pagar através do link'
          )
        );
      }

      contentElements.push(
        React.createElement(QRCodeContainer, { key: 'qr-container' }, ...qrElements)
      );

      elements.push(React.createElement(React.Fragment, { key: 'data-block' }, ...contentElements));
    }

    return elements;
  };

  return React.createElement(PixPaymentContainer, null, ...renderContent());
};

export const PixPaymentSection = PixPaymentSectionComponent;
export default PixPaymentSection;
