/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach } from "vitest";

import { createJwt } from "../../functions/_utils/adminAuth";
import { hashTokenDoPedido } from "../../functions/_utils/photoOrders";
import {
  onRequestGet,
  onRequestPost,
} from "../../functions/api/admin/photo-orders";

/**
 * Reemissão do link do pedido de fotos.
 *
 * O que está em jogo: o comprador pagou e o único endereço que abre os arquivos
 * foi por e-mail uma vez só. Aqui se garante que a organização consegue mandar
 * de novo — e que o link antigo morre quando isso acontece, senão "reemitir"
 * viraria "distribuir uma segunda chave" sem ninguém perceber.
 */

const SEGREDO_JWT = "segredo-de-teste";
const ADMIN = "admin@exemplo.com";

interface PedidoFake {
  id: string;
  customer_name: string;
  email: string;
  event_year: number;
  photo_count: number;
  amount_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  downloads_expire_at: string | null;
  access_token_hash: string;
  updated_at: string;
}

interface LinkFake {
  order_id: string;
  token: string;
  created_at: string;
  created_by: string;
}

/** D1 de mentira que entende só as três queries deste endpoint. */
class BancoFake {
  pedidos: PedidoFake[] = [];
  links: LinkFake[] = [];

  prepare(query: string) {
    const db = this;
    return {
      _args: [] as any[],
      bind(...args: any[]) {
        this._args = args;
        return this;
      },
      async first<T = any>(): Promise<T | null> {
        if (query.includes("SELECT id, status FROM photo_order")) {
          const pedido = db.pedidos.find(p => p.id === this._args[0]);
          return (pedido ? { id: pedido.id, status: pedido.status } : null) as T | null;
        }
        throw new Error(`query não prevista no fake: ${query}`);
      },
      async all<T = any>() {
        if (query.includes("FROM photo_order o")) {
          const filtro = this._args[0] as string | null;
          const alvo = filtro ? filtro.replace(/%/g, "") : null;
          const linhas = db.pedidos
            .filter(p => !alvo || p.email.includes(alvo) || p.customer_name.toLowerCase().includes(alvo))
            .map(p => {
              const link = db.links.find(l => l.order_id === p.id);
              return {
                ...p,
                token: link?.token ?? null,
                link_created_at: link?.created_at ?? null,
                link_created_by: link?.created_by ?? null,
              };
            });
          return { results: linhas as T[], success: true };
        }
        throw new Error(`query não prevista no fake: ${query}`);
      },
      async run() {
        if (query.includes("UPDATE photo_order")) {
          const [hash, atualizadoEm, vencimento, id] = this._args;
          const pedido = db.pedidos.find(p => p.id === id);
          if (pedido) {
            pedido.access_token_hash = hash;
            pedido.updated_at = atualizadoEm;
            // COALESCE(?3, downloads_expire_at): null mantém o prazo atual.
            pedido.downloads_expire_at = vencimento ?? pedido.downloads_expire_at;
          }
          return { success: true, meta: { changes: pedido ? 1 : 0 } };
        }
        if (query.includes("INSERT INTO photo_order_link")) {
          const [orderId, token, criadoEm, criadoPor] = this._args;
          const existente = db.links.find(l => l.order_id === orderId);
          if (existente) {
            existente.token = token;
            existente.created_at = criadoEm;
            existente.created_by = criadoPor;
          } else {
            db.links.push({ order_id: orderId, token, created_at: criadoEm, created_by: criadoPor });
          }
          return { success: true, meta: { changes: 1 } };
        }
        throw new Error(`query não prevista no fake: ${query}`);
      },
    } as any;
  }

  async batch(statements: any[]) {
    const saidas = [];
    for (const s of statements) saidas.push(await s.run());
    return saidas;
  }
}

function pedidoFake(extra: Partial<PedidoFake> = {}): PedidoFake {
  return {
    id: "pedido-1",
    customer_name: "Maria Silva",
    email: "maria@exemplo.com",
    event_year: 2026,
    photo_count: 2,
    amount_cents: 1000,
    status: "PAID",
    created_at: "2026-08-01T10:00:00.000Z",
    paid_at: "2026-08-01T10:05:00.000Z",
    downloads_expire_at: "2026-08-02T10:05:00.000Z",
    access_token_hash: "hash-antigo",
    updated_at: "2026-08-01T10:05:00.000Z",
    ...extra,
  };
}

let db: BancoFake;
let env: any;

beforeEach(() => {
  db = new BancoFake();
  env = {
    DB: db,
    ADMIN_JWT_SECRET: SEGREDO_JWT,
    ADMIN_DEFAULT_EMAIL: ADMIN,
    SITE_URL: "https://caminhodoperdao.com.br",
  };
});

async function autorizacao(): Promise<string> {
  const jwt = await createJwt({ sub: ADMIN, role: "admin" }, SEGREDO_JWT, 600);
  return `Bearer ${jwt}`;
}

async function chamar(
  metodo: "GET" | "POST",
  url: string,
  corpo?: unknown
): Promise<Response> {
  const request = new Request(url, {
    method: metodo,
    headers: {
      Authorization: await autorizacao(),
      ...(corpo ? { "Content-Type": "application/json" } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  const context = { request, env } as any;
  return metodo === "GET" ? onRequestGet(context) : onRequestPost(context);
}

const URL_BASE = "https://caminhodoperdao.com.br/api/admin/photo-orders";

describe("reemissão do link do pedido de fotos", () => {
  it("exige sessão de admin", async () => {
    const resposta = await onRequestPost({
      request: new Request(URL_BASE, { method: "POST", body: "{}" }),
      env,
    } as any);
    expect(resposta.status).toBe(401);
  });

  it("devolve uma URL que abre o pedido e derruba o link anterior", async () => {
    db.pedidos.push(pedidoFake());

    const resposta = await chamar("POST", URL_BASE, { order_id: "pedido-1" });
    expect(resposta.status).toBe(200);

    const dados = (await resposta.json()) as { url: string };
    const token = new URL(dados.url).searchParams.get("t") ?? "";

    // O hash guardado tem que casar com o token novo — é ele que autentica o
    // download. E não pode ser o hash antigo: o link velho precisa morrer.
    expect(db.pedidos[0].access_token_hash).toBe(await hashTokenDoPedido(token));
    expect(db.pedidos[0].access_token_hash).not.toBe("hash-antigo");
    expect(dados.url).toContain("/gallery/pedido?t=");
  });

  it("guarda a URL para a organização reenviar depois", async () => {
    db.pedidos.push(pedidoFake());
    const criada = (await (await chamar("POST", URL_BASE, { order_id: "pedido-1" })).json()) as {
      url: string;
    };

    const lista = (await (await chamar("GET", URL_BASE)).json()) as {
      pedidos: Array<{ url: string | null; url_gerada_por: string | null }>;
    };
    expect(lista.pedidos[0].url).toBe(criada.url);
    expect(lista.pedidos[0].url_gerada_por).toBe(ADMIN);
  });

  it("reemitir de novo substitui o link, sem deixar dois válidos", async () => {
    db.pedidos.push(pedidoFake());
    const primeira = (await (await chamar("POST", URL_BASE, { order_id: "pedido-1" })).json()) as {
      url: string;
    };
    const segunda = (await (await chamar("POST", URL_BASE, { order_id: "pedido-1" })).json()) as {
      url: string;
    };

    expect(segunda.url).not.toBe(primeira.url);
    expect(db.links).toHaveLength(1);
    expect(db.links[0].token).toBe(new URL(segunda.url).searchParams.get("t"));
  });

  it("pedido pago ganha prazo novo — é por isso que a pessoa pede o link", async () => {
    db.pedidos.push(pedidoFake({ downloads_expire_at: "2026-01-01T00:00:00.000Z" }));

    await chamar("POST", URL_BASE, { order_id: "pedido-1" });

    const prazo = new Date(db.pedidos[0].downloads_expire_at as string).getTime();
    expect(prazo).toBeGreaterThan(Date.now());
  });

  it("pedido que ainda não foi pago não ganha prazo de download", async () => {
    db.pedidos.push(pedidoFake({ status: "PENDING", downloads_expire_at: null }));

    const dados = (await (await chamar("POST", URL_BASE, { order_id: "pedido-1" })).json()) as {
      downloads_expiram_em: string | null;
    };

    expect(dados.downloads_expiram_em).toBeNull();
    expect(db.pedidos[0].downloads_expire_at).toBeNull();
  });

  it("pedido inexistente devolve 404 em vez de criar link solto", async () => {
    const resposta = await chamar("POST", URL_BASE, { order_id: "nao-existe" });
    expect(resposta.status).toBe(404);
    expect(db.links).toHaveLength(0);
  });

  it("a listagem filtra por e-mail", async () => {
    db.pedidos.push(pedidoFake(), pedidoFake({ id: "pedido-2", email: "joao@exemplo.com" }));

    const dados = (await (await chamar("GET", `${URL_BASE}?q=joao`)).json()) as {
      pedidos: Array<{ email: string }>;
    };

    expect(dados.pedidos).toHaveLength(1);
    expect(dados.pedidos[0].email).toBe("joao@exemplo.com");
  });

  it("pedido sem reemissão não inventa link", async () => {
    db.pedidos.push(pedidoFake());

    const dados = (await (await chamar("GET", URL_BASE)).json()) as {
      pedidos: Array<{ url: string | null }>;
    };

    expect(dados.pedidos[0].url).toBeNull();
  });
});
