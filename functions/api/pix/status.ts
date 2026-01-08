import { GetPixStatusResponse, PaymentRecord } from '../../../types/woovi';
import { hashEmailForLogging, getWooviChargeStatus } from '../../_utils/woovi';

export default async function handler(request: Request, context: any) {
  // Apenas GET
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Email é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ========== BUSCAR PAGAMENTO NO D1 ==========
    let payment: PaymentRecord | null = null;
    try {
      payment = await context.env.DB
        .prepare(
          `SELECT * FROM payments 
           WHERE email = ?
           ORDER BY created_at DESC
           LIMIT 1`
        )
        .bind(email)
        .first();
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Erro ao consultar status do pagamento',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!payment) {
      console.log(
        `Nenhum pagamento encontrado para ${hashEmailForLogging(email)}`
      );
      return new Response(
        JSON.stringify({
          status: 'created',
          message: 'Nenhum pagamento encontrado',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ========== SE STATUS NÃO FOR PAGO OU EXPIRADO, CONSULTAR WOOVI ==========
    if (
      payment.status !== 'paid' &&
      payment.status !== 'expired' &&
      payment.provider_charge_id
    ) {
      const appId = context.env.WOOVI_APP_ID;
      if (appId) {
        try {
          console.log(
            `Consultando status em Woovi: ${payment.correlation_id}`
          );
          const wooviResponse = await getWooviChargeStatus(
            appId,
            payment.provider_charge_id
          );

          const wooviStatus = wooviResponse.charge.status;
          let paymentStatus: 'created' | 'pending' | 'paid' | 'expired' | 'error' = payment.status;

          // Mapear status Woovi para nosso status
          if (wooviStatus === 'COMPLETED') {
            paymentStatus = 'paid';
          } else if (wooviStatus === 'EXPIRED') {
            paymentStatus = 'expired';
          } else if (wooviStatus === 'ACTIVE') {
            paymentStatus = 'pending';
          }

          // Atualizar no D1 se status mudou
          if (paymentStatus !== payment.status) {
            console.log(
              `Atualizando status: ${payment.status} -> ${paymentStatus}`
            );
            await context.env.DB
              .prepare('UPDATE payments SET status = ?, updated_at = ? WHERE id = ?')
              .bind(paymentStatus, Date.now(), payment.id)
              .run();

            payment.status = paymentStatus;
          }
        } catch (error: any) {
          console.error(
            `Erro ao consultar status em Woovi: ${error.message}`
          );
          // Continuar com status local, não falhar
        }
      }
    }

    // ========== RESPOSTA ==========
    const response: GetPixStatusResponse = {
      status: payment.status as GetPixStatusResponse['status'],
      paidAt: payment.status === 'paid' ? payment.updated_at : undefined,
      expiresAt: payment.expires_at || undefined,
      brcode: payment.brcode || undefined,
      qrCodeImage: payment.qr_code_image || undefined,
      qrCodeUrl: payment.qr_code_url || undefined,
      paymentUrl: `${context.env.SITE_URL || 'https://caminhodoperdao.com.br'}/pay/${payment.correlation_id}`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Erro interno:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Erro ao consultar status',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
