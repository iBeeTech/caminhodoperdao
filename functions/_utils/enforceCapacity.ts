/// <reference types="@cloudflare/workers-types" />
import { getCapacityLimits, CapacityEnv } from "./capacity";
import {
  countPaidNonStaff,
  countPaidSleepNonStaff,
  listPendingNonStaff,
  cancelRegistrationById,
} from "./registrations";
import { deleteWooviCharge } from "./woovi";

export interface EnforceCapacityEnv extends CapacityEnv {
  DB: D1Database;
  WOOVI_APP_ID?: string;
}

/**
 * Aplica a regra de lotação por pagamento: quando os PAGOS atingem o teto de um pool,
 * as inscrições PENDENTES daquele pool não podem mais virar vaga, então são canceladas.
 *
 * - Mosteiro lota (PAID de pernoite >= MAX_REGISTRATIONS_SLEEP): cancela os pendentes de
 *   pernoite por completo (eles não voltam a disputar as vagas gerais — decisão de negócio).
 * - Geral lota (PAID não-staff >= MAX_REGISTRATIONS): cancela TODOS os pendentes de peregrino.
 *
 * Para fechar o buraco do "PIX já aberto", antes de marcar CANCELED a gente invalida a
 * cobrança na Woovi. Se a Woovi recusar o delete (cobrança já paga), aquela inscrição NÃO é
 * cancelada — é o caso raro de corrida (a pessoa realmente pagou) e fica registrado como
 * [OVERFLOW] para tratamento manual, sem deixar alguém "pago e cancelado".
 *
 * Deve ser chamado logo após qualquer transição para PAID (webhook e consulta de status).
 */
export async function enforceCapacity(env: EnforceCapacityEnv): Promise<void> {
  try {
    const { maxRegistrationsNonStaff, maxRegistrationsSleep } = getCapacityLimits(env);

    const paidNonStaff = await countPaidNonStaff(env.DB);
    const paidSleepers = await countPaidSleepNonStaff(env.DB);

    const generalFull = paidNonStaff >= maxRegistrationsNonStaff;
    const monasteryFull = paidSleepers >= maxRegistrationsSleep;

    if (!generalFull && !monasteryFull) {
      return;
    }

    // Geral lotado tem precedência: cancela todos os pendentes de peregrino.
    // Caso só o mosteiro esteja lotado, restringe aos pendentes de pernoite.
    const onlySleep = generalFull ? false : true;
    const reason = generalFull ? "geral lotado (PAID >= teto)" : "mosteiro lotado (PAID >= teto)";

    const pendentes = await listPendingNonStaff(env.DB, onlySleep);
    if (pendentes.length === 0) {
      return;
    }

    const appId = env.WOOVI_APP_ID;

    for (const pendente of pendentes) {
      // Sem appId não dá pra invalidar a cobrança; cancela mesmo assim (a vaga não existe),
      // mas avisa que o PIX pode continuar pagável.
      if (!appId) {
        console.warn(
          `[CAPACITY] WOOVI_APP_ID ausente: cancelando ${pendente.id} sem invalidar o PIX (${reason}).`
        );
        await cancelRegistrationById(env.DB, pendente.id);
        continue;
      }

      if (!pendente.payment_ref) {
        await cancelRegistrationById(env.DB, pendente.id);
        continue;
      }

      const { deleted, status } = await deleteWooviCharge(appId, pendente.payment_ref);

      if (deleted) {
        await cancelRegistrationById(env.DB, pendente.id);
        console.log(`[CAPACITY] inscrição ${pendente.id} cancelada e PIX invalidado (${reason}).`);
      } else {
        // Delete recusado: provavelmente a cobrança já foi paga (corrida) — NÃO cancela.
        console.warn(
          `[OVERFLOW] não consegui invalidar o PIX da inscrição ${pendente.id} (status ${status}); ` +
            `provavelmente já paga. Mantida como está para tratamento manual (${reason}).`
        );
      }
    }
  } catch (error) {
    // Nunca derrubar o fluxo de pagamento por causa da limpeza de capacidade.
    console.error("Erro em enforceCapacity:", error);
  }
}
