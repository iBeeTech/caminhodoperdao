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

export interface WooviListedCharge {
  status?: string;
  correlationID?: string;
  transactionID?: string;
  value?: number;
  customer?: { name?: string; email?: string; taxID?: string | { taxID?: string } };
}

/**
 * Lista as cobranças COMPLETED (pagas) da Woovi, paginando até o fim.
 *
 * Rede de segurança na reconciliação: quando o GET direto de uma cobrança (por payment_ref)
 * falha — ex.: a cobrança foi apagada/expirada do lado da Woovi mas o PIX entrou —, dá pra
 * varrer as cobranças pagas e casar por referência (correlationID / transactionID) ou pelo
 * e-mail do cliente.
 *
 * `startISO`: data inicial em RFC 3339 (ex.: "2026-05-01T00:00:00Z") para limitar o período.
 */
export async function listWooviCompletedCharges(
  appId: string,
  startISO?: string
): Promise<WooviListedCharge[]> {
  const all: WooviListedCharge[] = [];
  const limit = 100;
  let skip = 0;

  // Cap de segurança (50 páginas) para nunca rodar infinito.
  for (let page = 0; page < 50; page += 1) {
    const params = new URLSearchParams({
      status: 'COMPLETED',
      skip: String(skip),
      limit: String(limit),
    });
    if (startISO) params.set('start', startISO);

    const response = await fetch(`${WOOVI_API_BASE}/api/v1/charge?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: appId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Woovi listCharges falhou (status ${response.status}) na página ${page}`);
      break;
    }

    const data = (await response.json()) as {
      charges?: WooviListedCharge[];
      data?: WooviListedCharge[];
    };
    const charges = data.charges ?? data.data ?? [];
    all.push(...charges);

    if (charges.length < limit) break;
    skip += limit;
  }

  return all;
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
