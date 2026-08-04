/// <reference types="@cloudflare/workers-types" />
import { conflict, json, notFound, serverError } from "../../../_utils/responses";
import { UserAuthEnv, authorizeUserRequest } from "../../../_utils/userAuth";
import { EventYearEnv, getEventYear } from "../../../_utils/eventYear";
import { createRefundRequest } from "../../../_utils/refunds";
import { USER_PROFILE_COLUMNS, UserProfileRow } from "../../../_utils/userProfile";

type Env = UserAuthEnv & EventYearEnv & { REGISTRATION_COST?: string };

/**
 * Cancelamento da própria inscrição, de dentro da conta.
 *
 * Antes isso era feito digitando o CPF no site público, o que dava acesso à
 * inscrição de quem tivesse o CPF de outra pessoa. Aqui exige sessão: só se
 * cancela o que é seu.
 *
 * ⚠️ **O dinheiro não volta sozinho.** A adquirente nova ainda não foi
 * escolhida, então o cancelamento faz o que já funcionava em 2026: marca a
 * inscrição como cancelada (liberando a vaga na hora) e abre um pedido em
 * `refund_requests`, que o admin resolve em `/admin/estorno`. A chave PIX sai
 * do cadastro da pessoa — foi para isso que ela passou a ser pedida no
 * formulário.
 *
 * Inscrição ainda não paga não gera pedido de estorno: não há o que devolver.
 *
 * ## Quem recebe o dinheiro numa inscrição que foi transferida
 *
 * Decidido pelo organizador em 04/08/2026: **a devolução vai para quem está com
 * a inscrição ATIVA no momento do cancelamento** — não para quem pagou lá atrás.
 *
 * O código já fazia isso por construção, e agora é intencional e não
 * coincidência: `auth.sub` é o dono atual da inscrição, e é do cadastro DELE que
 * saem a chave PIX e os dados do pedido. Depois de uma transferência, o dono
 * atual é quem recebeu.
 *
 * A consequência precisa estar dita na tela ANTES da troca, e está: quem cede
 * lê que, se a vaga for cancelada depois, o dinheiro não volta para ele. O
 * acerto entre as duas pessoas é por fora, e o sistema não entra nessa conta.
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const eventYear = getEventYear(context.env);

    const registration = await context.env.DB.prepare(
      `SELECT id, status, name, phone, email
         FROM registrations
        WHERE user_id = ?1 AND event_year = ?2 AND status IN ('PAID','PENDING')`
    )
      .bind(auth.sub, eventYear)
      .first<{ id: string; status: string; name: string; phone: string | null; email: string | null }>();

    if (!registration) return notFound("no_active_registration");

    // Transferência em andamento tranca o cancelamento: cancelar liberaria a
    // vaga que já foi prometida a outra pessoa.
    const openTransfer = await context.env.DB.prepare(
      `SELECT id FROM registration_transfers
        WHERE registration_id = ?1 AND status IN ('PENDENTE','LIBERADA')`
    )
      .bind(registration.id)
      .first<{ id: string }>();
    if (openTransfer) return conflict("transfer_in_progress");

    await context.env.DB.prepare(
      "UPDATE registrations SET status = 'CANCELED' WHERE id = ?1"
    )
      .bind(registration.id)
      .run();

    if (registration.status === "PAID") {
      const profile = await context.env.DB.prepare(
        `SELECT ${USER_PROFILE_COLUMNS} FROM users WHERE id = ?1`
      )
        .bind(auth.sub)
        .first<UserProfileRow>();

      const amountCents = Number(context.env.REGISTRATION_COST) || 0;
      await createRefundRequest(context.env.DB, {
        type: "inscricao",
        sourceId: registration.id,
        name: registration.name,
        phone: registration.phone,
        email: registration.email,
        amountCents,
        pixKey: profile?.refund_pix_key ?? null,
      });
    }

    return json(200, {
      canceled: true,
      // A tela precisa dizer a verdade sobre o dinheiro, e ela depende de a
      // inscrição ter sido paga e de haver chave PIX no cadastro.
      refundRequested: registration.status === "PAID",
    });
  } catch (error) {
    console.error("POST /api/me/registration/cancel falhou:", error);
    return serverError();
  }
};
