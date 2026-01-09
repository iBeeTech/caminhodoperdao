/**
 * Funções utilitárias para a API de versículos
 */

/**
 * Hash FNV-1a simples e determinístico
 * Usado para gerar um índice consistente para a mesma data
 */
export function fnv1aHash(str: string): number {
  let hash = 2166136261; // FNV offset basis para 32-bit
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  return Math.abs(hash);
}

/**
 * Seleciona um índice determinístico baseado em uma string (ex: data YYYY-MM-DD)
 */
export function getDeterministicIndex(key: string, arrayLength: number): number {
  const hash = fnv1aHash(key);
  return hash % arrayLength;
}

/**
 * Padroniza as respostas de sucesso
 */
export function successResponse(data: any, statusCode: number = 200) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Padroniza as respostas de erro
 */
export function errorResponse(message: string, statusCode: number = 400) {
  return new Response(
    JSON.stringify({
      error: message,
      status: statusCode,
    }),
    {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
