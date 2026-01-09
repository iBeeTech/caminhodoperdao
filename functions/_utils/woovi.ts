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
