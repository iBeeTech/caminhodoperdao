/**
 * Guarda de sessão do admin.
 *
 * O que estes testes protegem é a distinção que motivou o guarda: no back o 401
 * NÃO significa só "sessão expirada". Login com senha errada, admin/create e
 * reconcile-pix também devolvem 401, e derrubar a sessão neles deslogaria um
 * admin legítimo por errar a senha ou por clicar em algo que não é dele.
 * Por isso a decisão é pelo CÓDIGO no corpo, não pelo status.
 */

import { installAdminSessionGuard } from "../../../../src/utils/auth/adminSessionGuard";
import { getAdminToken, setAdminToken, clearAdminToken } from "../../../../src/utils/auth/adminSession";

// jsdom não traz Response. Este dublê cobre exatamente o que o guarda usa —
// status, json() e clone() — e, de propósito, MODELA O CORPO SÓ PODER SER LIDO
// UMA VEZ. Sem essa regra, o teste do clone() passaria mesmo se o guarda
// consumisse a resposta da tela, que é o bug que ele existe para impedir.
class FakeResponse {
  readonly status: number;
  private readonly body: string | null;
  private isUsed = false;

  constructor(body: string | null, status: number) {
    this.body = body;
    this.status = status;
  }

  async json(): Promise<unknown> {
    if (this.isUsed) throw new TypeError("body stream already read");
    this.isUsed = true;
    if (this.body === null) throw new SyntaxError("Unexpected end of JSON input");
    return JSON.parse(this.body);
  }

  clone(): FakeResponse {
    if (this.isUsed) throw new TypeError("cannot clone a used response");
    return new FakeResponse(this.body, this.status);
  }
}

/** Resposta como o back monta: json(status, { error }). */
function apiResponse(status: number, error?: string): Response {
  return new FakeResponse(error ? JSON.stringify({ error }) : null, status) as unknown as Response;
}

// O guarda embrulha o window.fetch uma única vez por carga do módulo, então a
// instalação acontece uma vez só — como no app de verdade.
let lastResponse: Response = apiResponse(200);
const originalFetch = jest.fn(async () => lastResponse);

beforeAll(() => {
  window.fetch = originalFetch as unknown as typeof window.fetch;
  installAdminSessionGuard();
});

beforeEach(() => {
  clearAdminToken();
  setAdminToken("token-vivo");
  originalFetch.mockClear();
});

async function call(url: string, status: number, error?: string): Promise<Response> {
  lastResponse = apiResponse(status, error);
  return window.fetch(url);
}

describe("installAdminSessionGuard", () => {
  it("derruba a sessão quando o token expirou (invalid_token)", async () => {
    await call("/api/admin/registrations", 401, "invalid_token");
    expect(getAdminToken()).toBeNull();
  });

  it("derruba a sessão quando o token não foi enviado (missing_token)", async () => {
    await call("/api/admin/inscritos", 401, "missing_token");
    expect(getAdminToken()).toBeNull();
  });

  it("NÃO derruba a sessão quando a senha do login está errada", async () => {
    await call("/api/admin/login", 401, "invalid_credentials");
    expect(getAdminToken()).toBe("token-vivo");
  });

  it("NÃO derruba a sessão em ação exclusiva do admin geral (create)", async () => {
    await call("/api/admin/create", 401, "not_allowed");
    expect(getAdminToken()).toBe("token-vivo");
  });

  it("NÃO derruba a sessão em ação exclusiva do admin geral (reconcile-pix)", async () => {
    await call("/api/admin/reconcile-pix", 401, "forbidden");
    expect(getAdminToken()).toBe("token-vivo");
  });

  it("NÃO derruba a sessão na troca de senha obrigatória, que é 403", async () => {
    await call("/api/admin/registrations", 403, "password_change_required");
    expect(getAdminToken()).toBe("token-vivo");
  });

  it("ignora 401 de rota que não é do admin", async () => {
    await call("/api/me/registration", 401, "invalid_token");
    expect(getAdminToken()).toBe("token-vivo");
  });

  it("não derruba quando o corpo do 401 não é legível", async () => {
    lastResponse = new FakeResponse("<html>502</html>", 401) as unknown as Response;
    await window.fetch("/api/admin/registrations");
    expect(getAdminToken()).toBe("token-vivo");
  });

  it("deixa a resposta legível para quem chamou (não consome o corpo)", async () => {
    const res = await call("/api/admin/registrations", 401, "invalid_token");
    await expect(res.json()).resolves.toEqual({ error: "invalid_token" });
  });

  it("não interfere na resposta de sucesso", async () => {
    lastResponse = new FakeResponse(JSON.stringify({ registrations: [] }), 200) as unknown as Response;
    const res = await window.fetch("/api/admin/registrations");
    expect(res.status).toBe(200);
    expect(getAdminToken()).toBe("token-vivo");
  });
});
