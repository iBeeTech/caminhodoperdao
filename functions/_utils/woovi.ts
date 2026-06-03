import { WooviChargePayload, WooviChargeResponse } from '../../types/woovi';

const WOOVI_API_BASE = 'https://api.openpix.com.br';

export async function createWooviCharge(
  appId: string,
  payload: WooviChargePayload
): Promise<WooviChargeResponse> {
  const response = await fetch(`${WOOVI_API_BASE}/api/v1/charge`, {
    method: 'POST',
    headers: {
      'Authorization': appId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const error = await response.json();
      errorDetail = JSON.stringify(error);
    } catch {
      errorDetail = await response.text();
    }
    console.error(`Woovi createCharge error: ${response.status} - ${errorDetail}`);
    throw new Error(
      `Woovi API error: ${response.status} - ${errorDetail}`
    );
  }

  return response.json();
}

export async function getWooviChargeStatus(
  appId: string,
  chargeId: string
): Promise<WooviChargeResponse> {
  const response = await fetch(
    `${WOOVI_API_BASE}/api/v1/charge/${chargeId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': appId,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    let errorDetail = '';
    try {
      const error = await response.json();
      errorDetail = JSON.stringify(error);
    } catch {
      errorDetail = await response.text();
    }
    console.error(`Woovi getChargeStatus error: ${response.status} - ${errorDetail}`);
    throw new Error(
      `Woovi API error: ${response.status} - ${errorDetail}`
    );
  }

  return response.json();
}

/**
 * Invalida (deleta) uma cobrança ainda não paga na Woovi/OpenPix.
 * Aceita tanto o transactionID (que usamos como payment_ref) quanto o correlationID
 * no path param `{id}`, do mesmo jeito que o GET de status já faz.
 *
 * Retorna { deleted: true } quando a Woovi confirma a exclusão. Quando a cobrança
 * não pode ser deletada (ex.: já foi paga / COMPLETED), a Woovi responde com erro e
 * devolvemos { deleted: false } com o status HTTP — sem lançar exceção — para o
 * chamador decidir o que fazer (ex.: tratar como overflow real e NÃO cancelar).
 */
export async function deleteWooviCharge(
  appId: string,
  chargeId: string
): Promise<{ deleted: boolean; status: number }> {
  const response = await fetch(`${WOOVI_API_BASE}/api/v1/charge/${chargeId}`, {
    method: 'DELETE',
    headers: {
      Authorization: appId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      errorDetail = JSON.stringify(await response.json());
    } catch {
      errorDetail = await response.text();
    }
    console.warn(`Woovi deleteCharge não removeu ${chargeId}: ${response.status} - ${errorDetail}`);
    return { deleted: false, status: response.status };
  }

  return { deleted: true, status: response.status };
}

/**
 * Hash an email for logging purposes (LGPD compliance)
 */
export function hashEmailForLogging(email: string): string {
  // Usar substring + hash simples para não expor email completo em logs
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '***';
  
  const visiblePart = localPart.substring(0, 2);
  const hashedPart = btoa(email).substring(0, 8);
  return `${visiblePart}***@${hashedPart}.log`;
}
