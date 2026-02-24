import { createWooviCharge } from './woovi';
import { WooviChargePayload } from '../../types/woovi';

export interface PaymentCharge {
  payment_ref: string;
  qrCodeText: string;
  qrCodeImageUrl?: string;
  expires_at?: string;
}

export interface PaymentProvider {
  createCharge(input: { name: string; email: string }): Promise<PaymentCharge>;
}

class WooviPixProvider implements PaymentProvider {
  private appId: string;
  private registrationCostCents: number;

  constructor(appId: string, registrationCostCents: number) {
    this.appId = appId;
    this.registrationCostCents = registrationCostCents;
  }

  async createCharge({ name, email }: { name: string; email: string }): Promise<PaymentCharge> {
    const correlationId = crypto.randomUUID();
    const expiresIn = 86400; // 24 horas em segundos

    const payload: WooviChargePayload = {
      correlationID: correlationId,
      value: this.registrationCostCents,
      comment: 'Inscrição - Caminhada do Perdão de Assis',
      expiresIn,
      customer: {
        name: name || email.split('@')[0],
        email,
      },
    };

    try {
      const response = await createWooviCharge(this.appId, payload);
      
      return {
        payment_ref: response.charge.transactionID,
        qrCodeText: response.charge.brCode,
        qrCodeImageUrl: response.charge.qrCodeImage,
        expires_at: response.charge.expiresDate,
      };
    } catch (error) {
      console.error('Error creating Woovi charge:', error);
      throw error;
    }
  }
}

function parseRegistrationCostCents(rawValue: unknown): number | null {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return null;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.trunc(parsed);
}

export function getPaymentProvider(env?: any): PaymentProvider {
  // Check if WOOVI_APP_ID is available
  const appId = env?.WOOVI_APP_ID || process.env.WOOVI_APP_ID;
  const registrationCostCents =
    parseRegistrationCostCents(env?.REGISTRATION_COST || process.env.REGISTRATION_COST) ?? 1000;
  
  if (!appId) {
    throw new Error('WOOVI_APP_ID not configured. Please set the WOOVI_APP_ID secret in Cloudflare.');
  }

  console.log('Using WooviPixProvider');
  return new WooviPixProvider(appId, registrationCostCents);
}
