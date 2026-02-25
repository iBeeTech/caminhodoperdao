/**
 * Exemplo de integração do PixPaymentSection no Landing Page
 * 
 * Adicione este componente após o usuário completar o cadastro
 * para exibir as opções de pagamento via PIX
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import PixPaymentSection from '../molecules/PixPaymentSection/PixPaymentSection';

const PaymentSectionContainer = styled.div`
  max-width: 600px;
  margin: 2rem auto;
`;

interface PaymentSectionProps {
  userEmail: string;
  userName?: string;
  amountCents?: number;
  onPaymentSuccess?: () => void;
}

/**
 * Componente para exibir a seção de pagamento no fluxo de cadastro
 */
const PaymentFlowSectionComponent = (
  props: PaymentSectionProps
) => {
  const {
    userEmail,
    userName,
    amountCents = 1000,
    onPaymentSuccess,
  } = props;
  
  const [showPayment, setShowPayment] = React.useState(false);

  const handlePaymentSuccess = () => {
    // Callback opcional
    onPaymentSuccess?.();

    // Aqui você pode:
    // - Redirecionar para página de sucesso
    // - Atualizar estado global
    // - Enviar email de confirmação
    // - Salvar informação no D1
    console.log('Pagamento confirmado para:', userEmail);
  };

  return React.createElement(
    PaymentSectionContainer,
    null,
    !showPayment
      ? React.createElement(
          'button',
          { onClick: () => setShowPayment(true) },
          '💳 Proceder com o Pagamento'
        )
      : React.createElement(PixPaymentSection, {
          email: userEmail,
          name: userName,
          amountCents: amountCents,
          description: 'Inscrição - Caminho do Perdão',
          onPaymentSuccess: handlePaymentSuccess,
        })
  );
};

export const PaymentFlowSection = PaymentFlowSectionComponent;
export default PaymentFlowSection;
