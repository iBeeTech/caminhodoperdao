/**
 * Email utilities using Resend (Free tier: 100 emails/day)
 * https://resend.com
 */

const RESEND_API_BASE = 'https://api.resend.com';

export interface SendEmailParams {
  to: string;
  name: string;
  registrationNumber: string;
}

export async function sendRegistrationConfirmationEmail(
  params: SendEmailParams,
  apiKey: string
): Promise<boolean> {
  const { to, name, registrationNumber } = params;

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@caminhadadoperdaodeassis.com.br',
        to,
        subject: '✅ Pagamento Confirmado - Caminhada do Perdão de Assis 2026',
        html: generateEmailHTML(name, registrationNumber),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro ao enviar email via Resend:', error);
      return false;
    }

    console.log(`Email enviado para ${to} com número: ${registrationNumber}`);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}

function generateEmailHTML(name: string, registrationNumber: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2d5016; color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .content { padding: 20px; background-color: #f9f9f9; margin-top: 20px; border-radius: 5px; }
          .registration-box { background-color: #e8f5e9; padding: 20px; margin: 20px 0; border-left: 4px solid #2d5016; border-radius: 5px; }
          .registration-number { font-size: 28px; font-weight: bold; color: #2d5016; }
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Pagamento Confirmado!</h2>
          </div>
          
          <div class="content">
            <p>Olá <strong>${name}</strong>,</p>
            
            <p>Agradecemos imensamente por sua inscrição na <strong>Caminhada do Perdão de Assis 2026</strong>! 🙏</p>
            
            <p>Seu pagamento foi confirmado com sucesso e sua inscrição está completa.</p>
            
            <div class="registration-box">
              <p style="margin: 0; color: #666;">Seu número de inscrição:</p>
              <div class="registration-number">${registrationNumber}</div>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Guarde este número para futuras referências</p>
            </div>
            
            <p>Você receberá em breve mais informações sobre a caminhada, incluindo:</p>
            <ul>
              <li>Data e horário de saída</li>
              <li>Local de concentração</li>
              <li>Recomendações e instruções</li>
              <li>Informações do monastério</li>
            </ul>
            
            <p>Se tiver dúvidas, entre em contato conosco.</p>
            
            <p>Que a paz esteja com você! 🕊️</p>
          </div>
          
          <div class="footer">
            <p>Caminhada do Perdão de Assis © 2026</p>
            <p>Este é um email automático, não responda neste endereço.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
