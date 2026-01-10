import { WooviWebhookPayload } from '../../types/woovi';

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
export default async function handler(request: Request, context: any) {
  try {
    // Retornar 200 para qualquer método primeiro
    if (request.method !== 'POST') {
      console.warn(`Webhook recebido com método ${request.method}`);
      return new Response('OK', { status: 200 });
    }

    // ========== PARSE PAYLOAD ==========
    let payload;
    try {
      payload = (await request.json()) as WooviWebhookPayload;
    } catch (e) {
      console.warn('Erro ao fazer parse do JSON:', e);
      return new Response('OK', { status: 200 });
    }

    // Validação básica
    if (!payload) {
      console.log('Payload vazio recebido');
      return new Response('OK', { status: 200 });
    }

    if (!payload.charge) {
      console.log('Payload sem charge:', JSON.stringify(payload));
      return new Response('OK', { status: 200 });
    }

    const { charge, pix } = payload;
    const correlationId = charge.correlationID || 'unknown';
    const transactionID = pix?.transactionID || charge.correlationID;

    console.log(
      `Webhook recebido - correlationID: ${correlationId}, status: ${charge.status}`
    );

    // ========== ATUALIZAR STATUS NO D1 ==========
    try {
      // Se o status é COMPLETED, marcar como PAID
      if (charge.status === 'COMPLETED') {
        // Buscar registro na tabela registrations pelo payment_ref (que é o transactionID)
        const registration = await context.env.DB
          .prepare('SELECT email, name FROM registrations WHERE payment_ref = ?')
          .bind(transactionID)
          .first() as any;

        if (registration) {
          // Gerar número de inscrição
          const registrationNumber = await generateRegistrationNumber(context.env.DB);

          // Atualizar o registro como PAID com número de inscrição
          await context.env.DB
            .prepare(
              "UPDATE registrations SET status = 'PAID', paid_at = ?, registration_number = ? WHERE email = ?"
            )
            .bind(Date.now(), registrationNumber, registration.email)
            .run();

          console.log(
            `Registro marcado como PAID: ${registration.email} (número: ${registrationNumber})`
          );
        } else {
          console.warn(`Registro não encontrado para transactionID: ${transactionID}`);
        }
      } else if (charge.status === 'EXPIRED') {
        const registration = await context.env.DB
          .prepare('SELECT email FROM registrations WHERE payment_ref = ?')
          .bind(transactionID)
          .first() as any;

        if (registration) {
          await context.env.DB
            .prepare("UPDATE registrations SET status = 'CANCELED' WHERE email = ?")
            .bind(registration.email)
            .run();

          console.log(
            `Registro marcado como CANCELED (expirado): ${registration.email}`
          );
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
    }

    // Retornar sempre 200
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response('OK', { status: 200 });
  }
}
