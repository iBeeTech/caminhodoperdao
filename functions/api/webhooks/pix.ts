import { WooviWebhookPayload } from '../../../types/woovi';
import { sendRegistrationConfirmationEmail } from '../../_utils/email';

/**
 * Função para gerar número de inscrição sequencial
 */
async function generateRegistrationNumber(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  
  // Contar registros pagos deste ano
  const result = await db
    .prepare(
      "SELECT COUNT(*) as count FROM registrations WHERE registration_number LIKE ? AND status = 'PAID'"
    )
    .bind(`%-${year}`)
    .first<{ count: number }>();
  
  const nextNumber = (result?.count || 0) + 1;
  return `${String(nextNumber).padStart(3, '0')}-${year}`;
}

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
      // Se o status é COMPLETED, marcar como PAID
      if (charge.status === 'COMPLETED') {
        // Buscar registro na tabela registrations pelo payment_ref (que é o transactionID)
        const registration = await context.env.DB
          .prepare('SELECT email, name FROM registrations WHERE payment_ref = ?')
          .bind(charge.transactionID)
          .first<{ email: string; name: string }>();

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

          // Enviar email de confirmação com número de inscrição
          if (context.env.RESEND_API_KEY) {
            const emailSent = await sendRegistrationConfirmationEmail(
              {
                to: registration.email,
                name: registration.name,
                registrationNumber,
              },
              context.env.RESEND_API_KEY
            );
            
            if (emailSent) {
              console.log(`Email enviado para ${registration.email}`);
            } else {
              console.warn(`Falha ao enviar email para ${registration.email}`);
            }
          } else {
            console.warn('RESEND_API_KEY não configurado, email não será enviado');
          }

          // Registrar informações da transação
          if (pix) {
            console.log(
              `PIX recebido: ${pix.value} centavos, endToEndId: ${pix.endToEndId}`
            );
          }
        } else {
          console.warn(`Registro não encontrado para transactionID: ${charge.transactionID}`);
        }
      } else if (charge.status === 'EXPIRED') {
        const registration = await context.env.DB
          .prepare('SELECT email FROM registrations WHERE payment_ref = ?')
          .bind(charge.transactionID)
          .first<{ email: string }>();

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
