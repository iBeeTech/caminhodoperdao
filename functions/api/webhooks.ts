import { WooviWebhookPayload } from '../../types/woovi';
import { enforceCapacity } from '../_utils/enforceCapacity';
import {
  getByMonasteryUpgradeRef,
  promoteToMonastery,
  clearMonasteryUpgradeRef,
} from '../_utils/registrations';

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

// Localiza a inscrição cuja cobrança de DIFERENÇA (troca geral -> pernoite) foi paga.
async function findMonasteryUpgradeByPaymentRefs(
  db: any,
  paymentRefs: string[]
): Promise<{ id: string; email: string } | null> {
  for (const ref of paymentRefs) {
    const found = await getByMonasteryUpgradeRef(db, ref);
    if (found) return found;
  }
  return null;
}

async function findTshirtPurchaseByPaymentRefs(
  db: any,
  paymentRefs: string[]
): Promise<{ id: string; customer_name: string } | null> {
  try {
    for (const ref of paymentRefs) {
      const purchase = (await db
        .prepare(
          `SELECT id, customer_name
           FROM tshirt_purchase
           WHERE payment_ref = ? OR correlation_id = ? OR provider_charge_id = ?
           ORDER BY datetime(created_at) DESC
           LIMIT 1`
        )
        .bind(ref, ref, ref)
        .first()) as any;

      if (purchase) {
        return purchase;
      }
    }
  } catch (error) {
    console.warn('Busca de compra de camiseta no webhook falhou:', error);
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
        let matchedAny = false;

        // Buscar registro na tabela registrations pelo payment_ref, tentando variações de referência.
        const registration = await findRegistrationByPaymentRefs(context.env.DB, paymentRefs);

        console.log('Resultado da query de busca:', registration);

        if (registration) {
          matchedAny = true;

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

          // Acabou de entrar uma vaga paga: se isso bateu o teto de algum pool,
          // cancela os pendentes (e invalida os PIX deles) para impedir overflow.
          await enforceCapacity(context.env);
        }

        const tshirtPurchase = await findTshirtPurchaseByPaymentRefs(context.env.DB, paymentRefs);
        if (tshirtPurchase) {
          matchedAny = true;
          const nowIso = new Date().toISOString();

          const updateResult = await context.env.DB
            .prepare(
              "UPDATE tshirt_purchase SET status = 'PAID', paid_at = ?, updated_at = ? WHERE id = ?"
            )
            .bind(nowIso, nowIso, tshirtPurchase.id)
            .run();

          console.log('Resultado do update da camiseta:', updateResult);
          console.log(`Compra de camiseta marcada como PAID: ${tshirtPurchase.customer_name}`);
        }

        // Pagamento da DIFERENÇA da troca geral -> pernoite: promove a inscrição (já PAGA)
        // para pernoite. A inscrição em si continua PAID; só passa a dormir no mosteiro.
        const upgrade = await findMonasteryUpgradeByPaymentRefs(context.env.DB, paymentRefs);
        if (upgrade) {
          matchedAny = true;
          await promoteToMonastery(context.env.DB, upgrade.id);
          console.log(`Pernoite confirmado (diferença paga): ${upgrade.email}`);
          // Promoção ocupa uma cama paga: pode ter batido o teto do mosteiro.
          await enforceCapacity(context.env);
        }

        if (!matchedAny) {
          console.warn(`Nenhum registro encontrado para refs: ${paymentRefs.join(', ')}`);
        }
      } else if (charge.status === 'EXPIRED') {
        let matchedAny = false;

        const registration = await findRegistrationByPaymentRefs(context.env.DB, paymentRefs);

        console.log('Resultado da query de busca (expirado):', registration);

        if (registration) {
          matchedAny = true;

          const updateResult = await context.env.DB
            .prepare("UPDATE registrations SET status = 'CANCELED' WHERE id = ?")
            .bind(registration.id)
            .run();

          console.log('Resultado do update (expirado):', updateResult);
          console.log(
            `Registro marcado como CANCELED (expirado): ${registration.email}`
          );
        }

        const tshirtPurchase = await findTshirtPurchaseByPaymentRefs(context.env.DB, paymentRefs);
        if (tshirtPurchase) {
          matchedAny = true;
          const nowIso = new Date().toISOString();

          const updateResult = await context.env.DB
            .prepare("UPDATE tshirt_purchase SET status = 'CANCELED', updated_at = ? WHERE id = ?")
            .bind(nowIso, tshirtPurchase.id)
            .run();

          console.log('Resultado do update da camiseta (expirado):', updateResult);
          console.log(`Compra de camiseta marcada como CANCELED (expirada): ${tshirtPurchase.customer_name}`);
        }

        // Cobrança de diferença (upgrade) expirada: a troca não se concretizou. A inscrição
        // geral PAGA permanece como está; só removemos o vínculo da cobrança pendente.
        for (const ref of paymentRefs) {
          await clearMonasteryUpgradeRef(context.env.DB, ref);
        }

        if (!matchedAny) {
          console.warn(`Nenhum registro encontrado para refs expiradas: ${paymentRefs.join(', ')}`);
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
