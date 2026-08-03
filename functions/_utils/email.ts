/// <reference types="@cloudflare/workers-types" />

/**
 * Envio de e-mail transacional via Resend.
 *
 * Domínio caminhodoperdao.com.br verificado em 03/08/2026 (DKIM + SPF), então
 * qualquer endereço @caminhodoperdao.com.br pode ser remetente — não existe
 * caixa postal por trás, o valor só viaja no campo "from".
 *
 * Decisão de projeto: o destinatário NÃO responde. Não há reply-to em lugar
 * nenhum e o "Enable Receiving" está desligado no Resend, então resposta a este
 * endereço volta com erro. Como o botão "Responder" existe em qualquer app de
 * e-mail, `renderEmail` carimba o aviso e o WhatsApp em todo corpo enviado.
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Caminho do Perdão <nao-responda@caminhodoperdao.com.br>";
const SUPPORT_WA_NUMBER = "5516982221415";

export interface EmailEnv {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  /** Corpo específico da mensagem. O rodapé padrão é acrescentado aqui dentro. */
  bodyHtml: string;
  bodyText: string;
}

export interface SendEmailResult {
  sent: boolean;
  error?: string;
}

/**
 * Envia e **nunca lança**. Chamador nenhum deve mudar de comportamento por
 * causa de falha de envio: em "esqueci minha senha", uma resposta diferente
 * quando o e-mail falha entregaria de bandeja quais endereços são de admin.
 * Falha vira log no servidor e `{ sent: false }` para quem quiser registrar.
 */
export async function sendEmail(
  env: EmailEnv,
  input: SendEmailInput
): Promise<SendEmailResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("sendEmail: RESEND_API_KEY ausente — nada foi enviado.");
    return { sent: false, error: "missing_api_key" };
  }

  const from = env.RESEND_FROM?.trim() || DEFAULT_FROM;

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: renderHtml(input.bodyHtml),
        text: renderText(input.bodyText),
      }),
    });

    if (!response.ok) {
      // O corpo do erro do Resend não traz segredo, mas traz o destinatário:
      // logamos só o status para o log não virar lista de e-mails.
      console.error(`sendEmail: Resend respondeu ${response.status}`);
      return { sent: false, error: `resend_${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.error("sendEmail: falha de rede ao chamar o Resend", error);
    return { sent: false, error: "network_error" };
  }
}

const NO_REPLY_NOTICE =
  "Este e-mail é automático e não recebe respostas. Precisa falar com a gente? Chame no WhatsApp:";

const SUPPORT_WA_URL = `https://wa.me/${SUPPORT_WA_NUMBER}`;

function renderHtml(body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f5f3ef;font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      ${body}
      <hr style="border:none;border-top:1px solid #e5e0d8;margin:32px 0 16px;" />
      <p style="font-size:13px;line-height:1.6;color:#6b6b6b;margin:0;">
        ${NO_REPLY_NOTICE}
        <a href="${SUPPORT_WA_URL}" style="color:#7a5c2e;">${SUPPORT_WA_NUMBER}</a>
      </p>
    </div>
  </body>
</html>`;
}

function renderText(body: string): string {
  return `${body}\n\n---\n${NO_REPLY_NOTICE} ${SUPPORT_WA_URL}\n`;
}
