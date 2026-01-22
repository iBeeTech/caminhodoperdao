import { CreatePixRequest, CreatePixResponse, PaymentRecord, WooviChargePayload } from '../../../types/woovi';
import { createWooviCharge, hashEmailForLogging } from '../../_utils/woovi';

// Validação básica de email
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Busca pagamento ativo/pendente não expirado para um email
 */
async function findActivePayment(
  db: any,
  email: string
): Promise<PaymentRecord | null> {
  try {
    const result = await db
      .prepare(
        `SELECT * FROM payments 
         WHERE email = ? 
         AND status IN ('created', 'pending') 
         AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .bind(email, Date.now())
      .first();

    return result || null;
  } catch (error) {
    console.error('Erro ao buscar pagamento ativo:', error);
    return null;
  }
}

/**
 * Salva novo pagamento no D1
 */

export default async function handler(request: Request, context: any) {
  // Apenas POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json()) as CreatePixRequest;
    const { email, name, amountCents, description } = body;

    // ========== VALIDAÇÕES ==========
    if (!email || !validateEmail(email)) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Email inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!amountCents || amountCents <= 0) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Valor deve ser maior que 0',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const appId = context.env.WOOVI_APP_ID;
    if (!appId) {
      console.error('WOOVI_APP_ID não configurado');
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Configuração de pagamento não disponível',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ========== VERIFICAR IDEMPOTÊNCIA ==========
    // Se já existe pagamento ativo/pendente não expirado, retornar
    const existingPayment = await findActivePayment(context.env.DB, email);
    if (existingPayment) {
      console.log(
        `Pagamento existente encontrado para ${hashEmailForLogging(email)}: ${existingPayment.correlation_id}`
      );

      const response: CreatePixResponse = {
        status: 'success',
        correlationId: existingPayment.correlation_id,
        brcode: existingPayment.brcode || undefined,
        qrCodeImage: existingPayment.qr_code_image || undefined,
        qrCodeUrl: existingPayment.qr_code_url || undefined,
        expiresAt: existingPayment.expires_at || undefined,
        paymentUrl: existingPayment.qr_code_url
          ? `${context.env.SITE_URL || 'https://caminhodoperdao.com.br'}/pay/${existingPayment.correlation_id}`
          : undefined,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ========== CRIAR COBRANÇA NA WOOVI ==========
    const correlationId = crypto.randomUUID();
    const expiresIn = 3600; // 1 hora

    const wooviPayload: WooviChargePayload = {
      correlationID: correlationId,
      value: amountCents,
      comment: description || 'Inscrição - Caminhada do Perdão de Assis',
      expiresIn,
      customer: name || email ? {
        name: name || email.split('@')[0],
        email,
      } : undefined,
    };

    console.log(
      `Criando cobrança Woovi para ${hashEmailForLogging(email)} - correlation_id: ${correlationId}`
    );

    let wooviResponse;
    try {
      wooviResponse = await createWooviCharge(appId, wooviPayload);
    } catch (error: any) {
      console.error(`Erro ao criar cobrança Woovi: ${error.message}`);

      // Salvar registro com erro
      await savePayment(context.env.DB, {
        email,
        correlation_id: correlationId,
        provider_charge_id: null,
        amount_cents: amountCents,
        status: 'error',
        brcode: null,
        qr_code_image: null,
        qr_code_url: null,
        expires_at: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Erro ao gerar cobrança PIX. Tente novamente.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ========== SALVAR NO D1 ==========
    const expiresAtMs = Date.now() + expiresIn * 1000;

    const payment = await savePayment(context.env.DB, {
      email,
      correlation_id: correlationId,
      provider_charge_id: wooviResponse.charge.transactionID,
      amount_cents: amountCents,
      status: 'pending',
      brcode: wooviResponse.charge.brCode,
      qr_code_image: wooviResponse.charge.qrCodeImage,
      qr_code_url: wooviResponse.charge.qrCodeImage,
      expires_at: expiresAtMs,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    console.log(
      `Cobrança criada com sucesso: ${correlationId}`
    );

    // ========== RESPOSTA ==========
    const response: CreatePixResponse = {
      status: 'success',
      correlationId: payment.correlation_id,
      brcode: payment.brcode || undefined,
      qrCodeImage: payment.qr_code_image || undefined,
      qrCodeUrl: payment.qr_code_url || undefined,
      expiresAt: payment.expires_at || undefined,
      paymentUrl: `${context.env.SITE_URL || 'https://caminhodoperdao.com.br'}/pay/${correlationId}`,
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
        message: 'Erro interno ao processar cobrança',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
