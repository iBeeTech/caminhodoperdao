import { WooviWebhookPayload } from '../../../types/woovi';

/**
 * Webhook para receber confirmações de pagamento PIX da Woovi
 * Evento: OPENPIX:TRANSACTION_RECEIVED
 */
export default async function handler(request: Request, context: any) {
  // Apenas POST
  if (request.method !== 'POST') {
    return new Response('Not allowed', { status: 405 });
  }

  try {
    // ========== VALIDAR WEBHOOK ==========
    // Opcional: validar token se configurado
    const webhookToken = request.headers.get('authorization');
    const configuredToken = context.env.WOOVI_WEBHOOK_SECRET;

    if (configuredToken && webhookToken !== configuredToken) {
      console.warn('Webhook token inválido');
      return new Response('Unauthorized', { status: 401 });
    }

    // ========== PARSE PAYLOAD ==========
    const payload = (await request.json()) as WooviWebhookPayload;

    if (!payload.charge || !payload.pix) {
      console.warn('Payload de webhook inválido:', payload);
      return new Response('Invalid payload', { status: 400 });
    }

    const { charge, pix } = payload;
    const correlationId = charge.correlationID;

    console.log(
      `Webhook recebido - correlationID: ${correlationId}, status: ${charge.status}`
    );

    // ========== ATUALIZAR STATUS NO D1 ==========
    try {
      // Buscar pagamento por correlation_id
      const payment = await context.env.DB
        .prepare('SELECT id FROM payments WHERE correlation_id = ?')
        .bind(correlationId)
        .first();

      if (!payment) {
        console.warn(`Pagamento não encontrado: ${correlationId}`);
        // Retornar 200 mesmo assim para Woovi não reenviar
        return new Response('OK', { status: 200 });
      }

      // Mapear status Woovi
      let newStatus = payment.status;
      if (charge.status === 'COMPLETED') {
        newStatus = 'paid';
      } else if (charge.status === 'EXPIRED') {
        newStatus = 'expired';
      }

      // Atualizar registro
      await context.env.DB
        .prepare(
          `UPDATE payments 
           SET status = ?, updated_at = ? 
           WHERE id = ?`
        )
        .bind(newStatus, Date.now(), payment.id)
        .run();

      console.log(
        `Pagamento atualizado: ${correlationId} -> ${newStatus}`
      );

      // Opcional: registrar informações da transação
      if (pix) {
        console.log(
          `PIX recebido: ${pix.value} centavos, endToEndId: ${pix.endToEndId}`
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      // Retornar 200 mesmo com erro para não reenviar webhook infinitamente
      return new Response('OK', { status: 200 });
    }

    // ========== RESPUESTA ==========
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Erro no webhook:', error);
    // Retornar 200 para Woovi não reenviar
    return new Response('OK', { status: 200 });
  }
}
