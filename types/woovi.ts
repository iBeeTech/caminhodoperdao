// Types para integração Woovi/OpenPix

export interface WooviChargePayload {
  correlationID: string;
  value: number; // em centavos
  comment?: string;
  expiresIn?: number; // segundos
  customer?: {
    name?: string;
    taxID?: string;
    email?: string;
    phone?: string;
  };
  additionalInfo?: Array<{
    key: string;
    value: string;
  }>;
}

export interface WooviChargeResponse {
  charge: {
    status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
    correlationID: string;
    transactionID: string;
    value: number;
    comment?: string;
    customer?: {
      name?: string;
      taxID?: string;
      email?: string;
      phone?: string;
    };
    paymentLinkID: string;
    paymentLinkUrl: string;
    qrCodeImage: string; // URL da imagem
    brCode: string; // Código PIX (copia e cola)
    expiresIn: number;
    expiresDate: string; // ISO 8601
    createdAt: string;
    updatedAt: string;
  };
}

export interface PaymentRecord {
  id: string;
  email: string;
  correlation_id: string;
  provider_charge_id: string | null;
  amount_cents: number;
  status: 'created' | 'pending' | 'paid' | 'expired' | 'error';
  brcode: string | null;
  qr_code_image: string | null;
  qr_code_url: string | null;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface CreatePixRequest {
  email: string;
  name?: string;
  amountCents: number;
  description?: string;
}

export interface CreatePixResponse {
  status: 'success' | 'error';
  message?: string;
  correlationId?: string;
  brcode?: string;
  qrCodeImage?: string;
  qrCodeUrl?: string;
  expiresAt?: number;
  paymentUrl?: string;
}

export interface GetPixStatusResponse {
  status: 'created' | 'pending' | 'paid' | 'expired' | 'error';
  paidAt?: number;
  expiresAt?: number | null;
  brcode?: string;
  qrCodeImage?: string | null;
  qrCodeUrl?: string | null;
  paymentUrl?: string;
}

export interface WooviWebhookPayload {
  charge?: {
    status: string;
    correlationID: string;
    value: number;
    createdAt: string;
    updatedAt: string;
  };
  pix?: {
    transactionID: string;
    value: number;
    time: string;
    endToEndId: string;
  };
}
