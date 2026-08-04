/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, serverError } from "../../../_utils/responses";
import { UserAuthEnv, authorizeUserRequest } from "../../../_utils/userAuth";
import { evaluateInvite, normalizeInviteCode } from "../../../_utils/inviteCodes";

type Env = UserAuthEnv;

/**
 * Descobre que tipo de código a pessoa tem em mãos.
 *
 * Existem dois, e eles não se parecem em nada por dentro:
 *
 * - **Convite** — gerado pelo admin, fura a lotação. Usado NA HORA de se
 *   inscrever, junto com pernoite e aceite de termos.
 * - **Transferência** — gerado por outro peregrino que está cedendo a vaga.
 *   Não cria inscrição nova: assume uma que já existe.
 *
 * ⚠️ Quem recebe um código **não sabe de qual tipo ele é** — recebeu um texto
 * pelo WhatsApp e pronto. Ter dois campos separados na tela transferia esse
 * problema para a pessoa errada: ela erraria o campo, veria "código inválido" e
 * concluiria que o código não presta. Por isso a tela passou a ter UM campo, e
 * é este endpoint que decide para onde mandá-la.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const raw = new URL(context.request.url).searchParams.get("code") || "";
  const code = raw.trim().toUpperCase();
  if (!code) return badRequest("missing_code");

  try {
    // Transferência primeiro: é o código mais "quente" (alguém está esperando
    // do outro lado) e o que tem prazo social, não só regra de sistema.
    const transfer = await context.env.DB.prepare(
      `SELECT from_name FROM registration_transfers
        WHERE transfer_code = ?1 AND status = 'LIBERADA'`
    )
      .bind(code)
      .first<{ from_name: string }>();

    if (transfer) {
      return json(200, { kind: "transfer", fromName: transfer.from_name });
    }

    const invite = await evaluateInvite(context.env.DB, normalizeInviteCode(code));
    if (invite.openable) return json(200, { kind: "invite" });

    // Convite que existe mas não abre (usado/revogado) devolve o motivo: dizer
    // "não encontrado" para um código que a pessoa recebeu de verdade a faria
    // duvidar do que digitou em vez de procurar a organização.
    return json(200, { kind: "unusable", reason: invite.reason });
  } catch (error) {
    console.error("GET /api/me/registration/code falhou:", error);
    return serverError();
  }
};
