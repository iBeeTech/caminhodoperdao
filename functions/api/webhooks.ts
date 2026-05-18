import { WooviWebhookPayload } from '../../types/woovi';

function getCandidatePaymentRefs(payload: WooviWebhookPayload): string[] {
  const refs = [
    payload.pix?.transactionID,
    payload.charge?.transactionID,
    payload.charge?.correlationID,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return Array.from(new Set(refs));
}

async function findRegistrationByPaymentRefs(
  db: any,
  paymentRefs: string[]
): Promise<{ id: string; email: string; name: string } | null> {
  for (const ref of paymentRefs) {
    const registration = (await db
      .prepare('SELECT id, email, name FROM registrations WHERE payment_ref = ?')
      .bind(ref)
      .first()) as any;

    if (registration) {
      return registration;
    }
  }

  // Fallback: tenta resolver via tabela payments caso registration.payment_ref esteja
  // em um identificador diferente do recebido no webhook.
  try {
    for (const ref of paymentRefs) {
      const payment = (await db
        .prepare(
          'SELECT correlation_id, provider_charge_id FROM payments WHERE correlation_id = ? OR provider_charge_id = ?'
        )
        .bind(ref, ref)
        .first()) as any;

      if (!payment) continue;

      const mappedRefs = [payment.correlation_id, payment.provider_charge_id].filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );

      for (const mappedRef of mappedRefs) {
        const registration = (await db
          .prepare('SELECT id, email, name FROM registrations WHERE payment_ref = ?')
          .bind(mappedRef)
          .first()) as any;

        if (registration) {
          return registration;
        }
      }
    }
  } catch (error) {
    console.warn('Fallback via tabela payments falhou:', error);
  }

  return null;
}

/**
 * Função para gerar número de inscrição sequencial
 */
async function generateRegistrationNumber(db: any): Promise<string> {
  const year = new Date().getFullYear();
  
  // Contar registros pagos deste ano
  const result = await db
    .prepare(
      "SELECT COUNT(*) as count FROM registrations WHERE registration_number LIKE ? AND status = 'PAID'"
    )
    .bind(`%-${year}`)
    .first() as any;
  
  const nextNumber = (result?.count || 0) + 1;
  return `${String(nextNumber).padStart(3, '0')}-${year}`;
}

/**
 * Webhook para receber confirmações de pagamento PIX da Woovi
 * POST /api/webhooks
 * Evento: OPENPIX:CHARGE_COMPLETED
 */
export const onRequestPost = async (context: { request: Request; env: any }) => {
  // Adicionar headers CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    let payload: WooviWebhookPayload;
    try {
      payload = await context.request.json();
    } catch (e) {
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Validação básica
    if (!payload || !payload.charge) {
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const { charge } = payload;
    const paymentRefs = getCandidatePaymentRefs(payload);

    if (!paymentRefs.length) {
      console.warn('Webhook sem identificador de pagamento. Payload:', JSON.stringify(payload));
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    console.log('Payload recebido:', JSON.stringify(payload));
    console.log('Refs candidatas de pagamento:', paymentRefs.join(', '));

    // ========== ATUALIZAR STATUS NO D1 ==========
    try {
      const isPaidStatus = ['COMPLETED', 'RECEIVED'].includes(charge.status);

      // Se o status é COMPLETED, marcar como PAID
      if (isPaidStatus) {
        // Buscar registro na tabela registrations pelo payment_ref, tentando variações de referência.
        const registration = await findRegistrationByPaymentRefs(context.env.DB, paymentRefs);

        console.log('Resultado da query de busca:', registration);

        if (registration) {
          // Gerar número de inscrição
          const registrationNumber = await generateRegistrationNumber(context.env.DB);

          // Atualizar o registro como PAID com número de inscrição
          const updateResult = await context.env.DB
            .prepare(
              "UPDATE registrations SET status = 'PAID', paid_at = ?, registration_number = ? WHERE id = ?"
            )
            .bind(Date.now(), registrationNumber, registration.id)
            .run();

          console.log('Resultado do update:', updateResult);
          console.log(
            `Registro marcado como PAID: ${registration.email} (número: ${registrationNumber})`
          );
        } else {
          console.warn(`Registro não encontrado para refs: ${paymentRefs.join(', ')}`);
        }
      } else if (charge.status === 'EXPIRED') {
        const registration = await findRegistrationByPaymentRefs(context.env.DB, paymentRefs);

        console.log('Resultado da query de busca (expirado):', registration);

        if (registration) {
          const updateResult = await context.env.DB
            .prepare("UPDATE registrations SET status = 'CANCELED' WHERE id = ?")
            .bind(registration.id)
            .run();

          console.log('Resultado do update (expirado):', updateResult);
          console.log(
            `Registro marcado como CANCELED (expirado): ${registration.email}`
          );
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
};

export const onRequestOptions = async () => {
  return new Response('OK', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
