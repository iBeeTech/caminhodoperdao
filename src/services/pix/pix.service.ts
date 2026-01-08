import { CreatePixRequest, CreatePixResponse, GetPixStatusResponse } from '../../../types/woovi';

const API_BASE = process.env.REACT_APP_API_URL || '';

/**
 * Cria uma cobrança PIX via Woovi
 */
export async function createPixCharge(request: CreatePixRequest): Promise<CreatePixResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/pix/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('Erro ao criar cobrança PIX:', error);
    return {
      status: 'error',
      message: 'Erro ao gerar cobrança. Tente novamente.',
    };
  }
}

/**
 * Consulta o status de uma cobrança PIX
 */
export async function getPixStatus(email: string): Promise<GetPixStatusResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/api/pix/status?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('Erro ao consultar status do PIX:', error);
    return null;
  }
}
