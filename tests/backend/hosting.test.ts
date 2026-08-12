/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach } from "vitest";

import {
  hostingCityFor,
  normalizeCityName,
  validateHostingInput,
  getHostingOffer,
  saveHostingOffer,
  cancelHostingOffer,
  listHostingOffers,
  toHostingView,
  HostingOfferRow,
} from "../../functions/_utils/hosting";

/**
 * Acolhimento (migration 038): quem mora em Franca ou Claraval recebe
 * peregrinos de fora.
 *
 * O que estes testes protegem, em ordem de importância:
 *
 * 1. **A elegibilidade** — quem é de fora não grava, e quem é de Franca não
 *    fica de fora por causa de um acento ou de uma letra maiúscula.
 * 2. **A oferta única por edição** — dois cliques não podem virar duas ofertas,
 *    senão a organização conta vaga que não existe.
 * 3. **O cancelamento que não apaga** — desistir vira `CANCELADO`; se a linha
 *    sumisse, a organização perderia o combinado sem aviso nenhum.
 */

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
}

/** Mock mínimo do D1: só as queries que o fluxo de acolhimento usa. */
class HostingD1 {
  offers: HostingOfferRow[] = [];
  users: UserRow[] = [];

  prepare(query: string) {
    const db = this;
    const statement = {
      _args: [] as any[],
      bind(...args: any[]) {
        this._args = args;
        return this;
      },
      async first<T = any>(): Promise<T | null> {
        return db.runFirst(query, this._args) as T | null;
      },
      async run() {
        db.runExec(query, this._args);
        return { success: true };
      },
      async all<T = any>() {
        return { results: db.runAll(query, this._args) as T[], success: true };
      },
    };
    return statement as any;
  }

  private runFirst(query: string, args: any[]): any {
    if (query.includes("FROM hosting_offers WHERE user_id")) {
      return this.offers.find(o => o.user_id === args[0] && o.event_year === args[1]) ?? null;
    }
    if (query.includes("FROM users WHERE id")) {
      return this.users.find(u => u.id === args[0]) ?? null;
    }
    return null;
  }

  private runAll(query: string, args: any[]): any[] {
    if (query.includes("FROM hosting_offers o")) {
      return this.offers
        .filter(o => o.event_year === args[0])
        .map(o => {
          const host = this.users.find(u => u.id === o.user_id);
          return {
            ...o,
            host_name: host?.name ?? null,
            host_email: host?.email ?? null,
            host_phone: host?.phone ?? null,
          };
        })
        .sort(
          (a, b) => a.status.localeCompare(b.status) || a.created_at - b.created_at
        );
    }
    return [];
  }

  private runExec(query: string, args: any[]) {
    if (query.includes("INSERT INTO hosting_offers")) {
      const [
        id,
        userId,
        eventYear,
        city,
        spots,
        genderPreference,
        offersMeal,
        offersShower,
        offersTransport,
        address,
        contactPhone,
        notes,
        now,
      ] = args;

      // O UNIQUE (user_id, event_year) do banco, imitado: o segundo INSERT vira
      // UPDATE da mesma linha, nunca uma linha nova.
      const existing = this.offers.find(
        o => o.user_id === userId && o.event_year === eventYear
      );
      if (existing) {
        Object.assign(existing, {
          city,
          spots,
          gender_preference: genderPreference,
          offers_meal: offersMeal,
          offers_shower: offersShower,
          offers_transport: offersTransport,
          address,
          contact_phone: contactPhone,
          notes,
          status: "ATIVO",
          updated_at: now,
        });
        return;
      }

      this.offers.push({
        id,
        user_id: userId,
        event_year: eventYear,
        city,
        spots,
        gender_preference: genderPreference,
        offers_meal: offersMeal,
        offers_shower: offersShower,
        offers_transport: offersTransport,
        address,
        contact_phone: contactPhone,
        notes,
        status: "ATIVO",
        created_at: now,
        updated_at: now,
      });
      return;
    }

    if (query.includes("UPDATE hosting_offers SET status = 'CANCELADO'")) {
      const offer = this.offers.find(o => o.user_id === args[0] && o.event_year === args[1]);
      if (offer) {
        offer.status = "CANCELADO";
        offer.updated_at = args[2];
      }
    }
  }
}

const VALID_INPUT = {
  spots: 2,
  genderPreference: "feminino",
  offersMeal: true,
  offersShower: true,
  offersTransport: false,
  address: "Rua das Flores, 100 - Centro",
  contactPhone: "(16) 99999-1234",
  notes: "Tenho cachorro.",
};

describe("acolhimento — cidade elegível", () => {
  it("aceita as duas cidades da caminhada, sem ligar para acento e caixa", () => {
    expect(hostingCityFor("Franca")).toBe("franca");
    expect(hostingCityFor("FRANCA")).toBe("franca");
    expect(hostingCityFor("  franca  ")).toBe("franca");
    expect(hostingCityFor("Claraval")).toBe("claraval");
    expect(hostingCityFor("Cláraval")).toBe("claraval");
  });

  it("recusa qualquer outra cidade — e o cadastro vazio", () => {
    expect(hostingCityFor("Ribeirão Preto")).toBeNull();
    expect(hostingCityFor("São Paulo")).toBeNull();
    expect(hostingCityFor("")).toBeNull();
    expect(hostingCityFor(null)).toBeNull();
    expect(hostingCityFor(undefined)).toBeNull();
  });

  it("não confunde cidade parecida com cidade elegível", () => {
    expect(hostingCityFor("Francisco Morato")).toBeNull();
    expect(hostingCityFor("Nova Franca")).toBeNull();
  });

  it("normaliza tirando acento e caixa", () => {
    expect(normalizeCityName(" Cláraval ")).toBe("claraval");
  });
});

describe("acolhimento — validação do que a tela manda", () => {
  it("aceita uma oferta completa e normaliza o telefone", () => {
    const result = validateHostingInput(VALID_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.contactPhone).toBe("16999991234");
    expect(result.value.spots).toBe(2);
    expect(result.value.genderPreference).toBe("feminino");
  });

  it("recusa oferta de zero vaga, fracionada ou absurda", () => {
    for (const spots of [0, -1, 2.5, 21, "duas"]) {
      const result = validateHostingInput({ ...VALID_INPUT, spots });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("invalid_spots");
    }
  });

  it("recusa endereço vazio: a organização não tem para onde mandar ninguém", () => {
    const result = validateHostingInput({ ...VALID_INPUT, address: "  " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_hosting_address");
  });

  it("recusa telefone que não é telefone", () => {
    const result = validateHostingInput({ ...VALID_INPUT, contactPhone: "1234" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_hosting_phone");
  });

  it("recusa preferência que não existe", () => {
    const result = validateHostingInput({ ...VALID_INPUT, genderPreference: "qualquer_um" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_gender_preference");
  });

  it("assume 'tanto faz' quando a preferência não vem", () => {
    const { genderPreference, ...withoutPreference } = VALID_INPUT;
    const result = validateHostingInput(withoutPreference);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.genderPreference).toBe("qualquer");
  });
});

describe("acolhimento — gravação", () => {
  let db: HostingD1;

  const save = (userId: string, overrides: Partial<typeof VALID_INPUT> = {}, now = 1000) => {
    const validation = validateHostingInput({ ...VALID_INPUT, ...overrides });
    if (!validation.ok) throw new Error(validation.error);
    return saveHostingOffer(db as unknown as D1Database, {
      id: `offer-${userId}`,
      userId,
      eventYear: 2027,
      city: "claraval",
      input: validation.value,
      now,
    });
  };

  beforeEach(() => {
    db = new HostingD1();
    db.users = [
      {
        id: "u1",
        email: "maria@exemplo.com",
        name: "Maria de Claraval",
        phone: "16999991234",
        city: "Claraval",
        address: "Rua das Flores",
        number: "100",
        complement: null,
      },
    ];
  });

  it("grava a oferta do ano e devolve o que a tela mostra", async () => {
    await save("u1");
    const row = await getHostingOffer(db as unknown as D1Database, "u1", 2027);
    expect(row).not.toBeNull();

    const view = toHostingView(row!);
    expect(view.spots).toBe(2);
    expect(view.city).toBe("claraval");
    expect(view.cityLabel).toBe("Claraval (MG)");
    expect(view.offersMeal).toBe(true);
    expect(view.offersTransport).toBe(false);
    expect(view.status).toBe("ATIVO");
  });

  it("gravar de novo ATUALIZA a mesma oferta — dois cliques não viram duas vagas", async () => {
    await save("u1", { spots: 2 });
    await save("u1", { spots: 5 }, 2000);

    expect(db.offers).toHaveLength(1);
    const row = await getHostingOffer(db as unknown as D1Database, "u1", 2027);
    expect(row?.spots).toBe(5);
    expect(row?.updated_at).toBe(2000);
  });

  it("cancelar não apaga a linha: vira CANCELADO", async () => {
    await save("u1");
    await cancelHostingOffer(db as unknown as D1Database, "u1", 2027, 3000);

    expect(db.offers).toHaveLength(1);
    const row = await getHostingOffer(db as unknown as D1Database, "u1", 2027);
    expect(row?.status).toBe("CANCELADO");
  });

  it("gravar depois de cancelar reativa a oferta", async () => {
    await save("u1");
    await cancelHostingOffer(db as unknown as D1Database, "u1", 2027, 3000);
    await save("u1", { spots: 3 }, 4000);

    const row = await getHostingOffer(db as unknown as D1Database, "u1", 2027);
    expect(row?.status).toBe("ATIVO");
    expect(row?.spots).toBe(3);
  });

  it("a oferta é por edição: o ano seguinte começa vazio", async () => {
    await save("u1");
    const nextYear = await getHostingOffer(db as unknown as D1Database, "u1", 2028);
    expect(nextYear).toBeNull();
  });
});

describe("acolhimento — a lista da organização", () => {
  it("traz o nome de quem recebe junto da oferta", async () => {
    const db = new HostingD1();
    db.users = [
      {
        id: "u1",
        email: "maria@exemplo.com",
        name: "Maria de Claraval",
        phone: "16999991234",
        city: "Claraval",
        address: "Rua das Flores",
        number: "100",
        complement: null,
      },
    ];
    const validation = validateHostingInput(VALID_INPUT);
    if (!validation.ok) throw new Error(validation.error);
    await saveHostingOffer(db as unknown as D1Database, {
      id: "offer-1",
      userId: "u1",
      eventYear: 2027,
      city: "claraval",
      input: validation.value,
      now: 1000,
    });

    const rows = await listHostingOffers(db as unknown as D1Database, 2027);
    expect(rows).toHaveLength(1);
    expect(rows[0].host_name).toBe("Maria de Claraval");
    expect(rows[0].host_email).toBe("maria@exemplo.com");
    expect(rows[0].spots).toBe(2);
  });
});
