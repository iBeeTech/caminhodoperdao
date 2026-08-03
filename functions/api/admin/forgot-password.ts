/// <reference types="@cloudflare/workers-types" />
import { badRequest, json } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import { AdminAuthEnv, getAdminByEmail, getJwtSecret } from "../../_utils/adminAuth";
import { EmailEnv, sendEmail } from "../../_utils/email";
import {
  MAX_REQUESTS_PER_EMAIL,
  MAX_REQUESTS_PER_IP,
  OTP_TTL_MS,
  RATE_WINDOW_MS,
  countRecentRequestsByEmail,
  countRecentRequestsByIp,
  createChallenge,
  generateChallengeId,
  generateOtpCode,
  hmacHex,
  logResetRequest,
  purgeExpiredChallenges,
} from "../../_utils/passwordOtp";

type Env = AdminAuthEnv & EmailEnv;

/**
 * Endpoint PÚBLICO de "Esqueci minha senha". Gera um código de 6 dígitos e o
 * envia por e-mail, sozinho — ninguém mais fica no meio do processo.
 *
 * A resposta é sempre a mesma, exista o e-mail ou não: mesmo formato, mesmo
 * status e um challengeId de aparência idêntica. Caso contrário o formulário
 * viraria um detector de quais e-mails são de admin.
 *
 * O envio vai em waitUntil de propósito: e-mail leva centenas de milissegundos
 * e só acontece para conta existente. Respondendo antes de enviar, o tempo de
 * resposta deixa de denunciar se a conta existe.
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  let body: { email?: string } = {};
  try {
    body = (await context.request.json()) as { email?: string };
  } catch {
    return badRequest("invalid_json");
  }

  const email = body.email?.trim().toLowerCase() || "";
  if (!email || !isValidEmail(email)) {
    return badRequest("invalid_email");
  }

  const secret = getJwtSecret(context.env);
  if (!secret) {
    // Sem o segredo não há como guardar o código em HMAC. Falhar aqui é melhor
    // do que gravar um desafio que nunca poderá ser validado.
    console.error("forgot-password: ADMIN_JWT_SECRET ausente.");
    return json(500, { error: "admin_jwt_secret_missing" });
  }

  const now = Date.now();
  const since = now - RATE_WINDOW_MS;
  const requestIp = context.request.headers.get("CF-Connecting-IP") || "unknown";

  // Sem a conferência humana que existia antes, o limite de pedidos é o que
  // resta contra abuso. Os dois contadores leem password_reset_requests, que
  // recebe linha para qualquer e-mail — por isso não vazam existência de conta.
  const [byIp, byEmail] = await Promise.all([
    countRecentRequestsByIp(context.env.DB, requestIp, since),
    countRecentRequestsByEmail(context.env.DB, email, since),
  ]);

  if (byIp >= MAX_REQUESTS_PER_IP || byEmail >= MAX_REQUESTS_PER_EMAIL) {
    // 429 não revela nada sobre contas: fala do pedido, não do destinatário.
    return json(429, { error: "too_many_requests" });
  }

  await logResetRequest(context.env.DB, { email, requestIp, now });
  await purgeExpiredChallenges(context.env.DB, now);

  const admin = await getAdminByEmail(context.env.DB, email);

  if (!admin) {
    // E-mail desconhecido: devolve um id descartável, com a mesma cara de um
    // real. Quem tentar validá-lo recebe exatamente o erro de código inválido.
    return json(200, { challengeId: generateChallengeId() });
  }

  const challengeId = generateChallengeId();
  const code = generateOtpCode();
  const codeHash = await hmacHex(code, secret);

  await createChallenge(context.env.DB, {
    id: challengeId,
    email,
    codeHash,
    requestIp,
    now,
  });

  context.waitUntil(sendOtpEmail(context.env, email, code));

  return json(200, { challengeId });
};

async function sendOtpEmail(env: Env, to: string, code: string): Promise<void> {
  const minutes = Math.round(OTP_TTL_MS / 60000);
  await sendEmail(env, {
    to,
    subject: `${code} é o seu código de acesso`,
    bodyHtml: `
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Olá,</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
        Recebemos um pedido para redefinir a senha do painel do Caminho do Perdão.
        Use o código abaixo:
      </p>
      <p style="font-size:34px;letter-spacing:10px;font-weight:bold;text-align:center;margin:0 0 24px;color:#7a5c2e;">
        ${code}
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">
        O código vale por <strong>${minutes} minutos</strong> e só pode ser usado uma vez.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0;color:#6b6b6b;">
        Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.
      </p>`,
    bodyText: [
      "Olá,",
      "",
      "Recebemos um pedido para redefinir a senha do painel do Caminho do Perdão.",
      `Seu código é: ${code}`,
      "",
      `O código vale por ${minutes} minutos e só pode ser usado uma vez.`,
      "Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.",
    ].join("\n"),
  });
}
