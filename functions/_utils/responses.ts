export function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function badRequest(message: string): Response {
  return json(400, { error: message });
}

export function conflict(message: string, extra?: Record<string, unknown>): Response {
  return json(409, { error: message, ...(extra || {}) });
}

export function notFound(message: string): Response {
  return json(404, { error: message });
}

export function unauthorized(message: string): Response {
  return json(401, { error: message });
}

export function serverError(message = "internal_error"): Response {
  return json(500, { error: message });
}
