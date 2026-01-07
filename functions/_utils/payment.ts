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

export function getPaymentProvider(): PaymentProvider {
  // TODO: plug real PIX gateway using env.GATEWAY_API_KEY
  return new MockPixProvider();
}
