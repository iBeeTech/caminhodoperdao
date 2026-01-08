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

class MockPixProvider implements PaymentProvider {
  async createCharge({ name, email }: { name: string; email: string }): Promise<PaymentCharge> {
    const ref = `PIX-${crypto.randomUUID()}`;
    const qrCodeText = `PIX|REF=${ref}|EMAIL=${email}|NAME=${encodeURIComponent(name)}`;
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return { payment_ref: ref, qrCodeText, expires_at };
  }
}

class WooviPixProvider implements PaymentProvider {
  private appId: string;

  constructor(appId: string) {
    this.appId = appId;
  }

  async createCharge({ name, email }: { name: string; email: string }): Promise<PaymentCharge> {
    const correlationId = crypto.randomUUID();
    const expiresIn = 86400; // 24 horas em segundos
    const REGISTRATION_VALUE = 1000; // R$ 10,00 em centavos

    const payload: WooviChargePayload = {
      correlationID: correlationId,
      value: REGISTRATION_VALUE,
      comment: 'Inscrição - Caminho do Perdão',
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

export function getPaymentProvider(env?: any): PaymentProvider {
  // Check if WOOVI_APP_ID is available
  const appId = env?.WOOVI_APP_ID || process.env.WOOVI_APP_ID;
  
  if (appId) {
    console.log('Using WooviPixProvider');
    return new WooviPixProvider(appId);
  }

  console.warn('WOOVI_APP_ID not configured, falling back to MockPixProvider');
  return new MockPixProvider();
}
