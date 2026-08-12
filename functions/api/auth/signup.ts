/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, serverError } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import { hashPassword } from "../../_utils/passwordHash";
import { EmailEnv, sendEmail } from "../../_utils/email";
import { UserAuthEnv, getUserByEmail, getUserJwtSecret } from "../../_utils/userAuth";
import { generateOtpCode, hmacHex } from "../../_utils/passwordOtp";
import { blockWhenEnrollmentClosed } from "../../_utils/enrollmentGate";

type Env = UserAuthEnv & EmailEnv;

const MIN_PASSWORD_LENGTH = 8;
const CONFIRM_TTL_MS = 30 * 60 * 1000;

/**
 * Cria a conta do peregrino e envia o código de confirmação do e-mail.
 *
 * A conta nasce **não confirmada**: sem confirmar, ela não se inscreve nem
 * abre o perfil. Isso existe porque um endereço digitado errado geraria uma
 * conta que nunca recebe nada — e agora é por e-mail que passam inscrição, QR
 * code e troca de inscrição.
 *
 * A resposta é sempre a mesma, exista a conta ou não. Um "e-mail já cadastrado"
 * transformaria o formulário num detector de quem é peregrino — e a lista de
 * quem foi a um evento religioso é justamente o tipo de dado que não se entrega.
 * Quem já tem conta recebe um e-mail avisando, em vez de um erro na tela.
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  let body: { email?: string; password?: string } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";

  if (!email || !isValidEmail(email)) return badRequest("invalid_email");
  if (password.length < MIN_PASSWORD_LENGTH) return badRequest("password_too_short");

  const secret = getUserJwtSecret(context.env);
  if (!secret) {
    console.error("signup: segredo ausente para o HMAC do código.");
    return serverError("user_jwt_secret_missing");
  }

  // Inscrições encerradas não abrem conta nova. Diferente do login, aqui a
  // recusa é explícita mesmo sabendo que ela revela o estado da porta: o
  // estado da porta já é público (a home diz "inscrições encerradas"), e
  // devolver "criado" sem criar nada faria a pessoa esperar um e-mail que
  // nunca chega. Ver `_utils/enrollmentGate.ts`.
  const closed = await blockWhenEnrollmentClosed(context.env.DB, email);
  if (closed) return closed;

  try {
    const now = Date.now();
    const existing = await getUserByEmail(context.env.DB, email);

    if (existing) {
      // Não confirmar nem negar. Quem for o dono do e-mail recebe o aviso; quem
      // estiver sondando vê a mesma resposta de um cadastro novo.
      context.waitUntil(sendAlreadyRegisteredEmail(context.env, email));
      return json(201, { created: true });
    }

    const code = generateOtpCode();
    const codeHash = await hmacHex(code, secret);

    await context.env.DB.prepare(
      `INSERT INTO users
         (id, email, password_hash, confirm_code_hash, confirm_expires_at,
          confirm_attempts, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?6)`
    )
      .bind(
        crypto.randomUUID(),
        email,
        await hashPassword(password),
        codeHash,
        now + CONFIRM_TTL_MS,
        now
      )
      .run();

    // waitUntil: responder antes de enviar faz o tempo de resposta ser igual
    // para conta nova e conta existente. Sem isso, o relógio denunciaria qual é
    // qual, desfazendo o cuidado de responder sempre a mesma coisa.
    context.waitUntil(sendConfirmationEmail(context.env, email, code));

    return json(201, { created: true });
  } catch (error) {
    console.error("signup falhou:", error);
    return serverError();
  }
};

async function sendConfirmationEmail(env: Env, to: string, code: string): Promise<void> {
  const minutes = Math.round(CONFIRM_TTL_MS / 60000);
  await sendEmail(env, {
    to,
    subject: `${code} é o seu código de confirmação`,
    bodyHtml: `
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Que bom ter você aqui.</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
        Para confirmar seu e-mail e concluir o cadastro no Caminho do Perdão, use o código:
      </p>
      <p style="font-size:34px;letter-spacing:10px;font-weight:bold;text-align:center;margin:0 0 24px;color:#7a5c2e;">
        ${code}
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0;">
        O código vale por <strong>${minutes} minutos</strong>.
      </p>`,
    bodyText: [
      "Que bom ter você aqui.",
      "",
      "Para confirmar seu e-mail e concluir o cadastro no Caminho do Perdão,",
      `use o código: ${code}`,
      "",
      `O código vale por ${minutes} minutos.`,
    ].join("\n"),
  });
}

async function sendAlreadyRegisteredEmail(env: Env, to: string): Promise<void> {
  await sendEmail(env, {
    to,
    subject: "Você já tem cadastro no Caminho do Perdão",
    bodyHtml: `
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Olá,</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
        Alguém tentou criar uma conta com este e-mail, mas você já tem cadastro.
        É só entrar com a sua senha.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0;color:#6b6b6b;">
        Esqueceu a senha? Use a opção "Esqueci minha senha" na tela de entrada.
        Se não foi você que tentou, pode ignorar este e-mail.
      </p>`,
    bodyText: [
      "Olá,",
      "",
      "Alguém tentou criar uma conta com este e-mail, mas você já tem cadastro.",
      "É só entrar com a sua senha.",
      "",
      'Esqueceu a senha? Use a opção "Esqueci minha senha" na tela de entrada.',
      "Se não foi você que tentou, pode ignorar este e-mail.",
    ].join("\n"),
  });
}
