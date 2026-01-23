import { onRequestGet } from "../../functions/api/whatsapp/next";

describe("WhatsApp Round Robin Endpoint", () => {
  const WA_NUMBERS = [
    "5516982221415",
    "5516999650319",
    "5516999994064",
    "5516992051785",
    "5534992896160",
    "5516999690305",
    "5516999651001",
  ];

  function makeEnv() {
    let counter = 0;
    const data = { counter: 0 };
    return {
      DB: {
        prepare: (query: string) => ({
          run: async () => {
            if (query.includes("UPDATE whatsapp_round_robin SET counter = counter + 1")) {
              counter += 1;
              data.counter = counter;
            }
          },
          first: async () => {
            if (query.includes("RETURNING counter")) {
              counter += 1;
              data.counter = counter;
              return { counter };
            }
            if (query.includes("SELECT counter")) {
              return { counter: data.counter };
            }
            return null;
          },
        }),
      },
    };
  }

  it("deve alternar os números corretamente", async () => {
    const results: string[] = [];
    for (let i = 0; i < 8; i++) {
      const req = new Request("http://localhost/api/whatsapp/next");
      const resp = await onRequestGet({ env: makeEnv(), request: req } as any);
      const data = await resp.json();
      results.push(data.phone);
    }
    expect(results).toEqual([
      WA_NUMBERS[0],
      WA_NUMBERS[1],
      WA_NUMBERS[2],
      WA_NUMBERS[3],
      WA_NUMBERS[4],
      WA_NUMBERS[5],
      WA_NUMBERS[6],
      WA_NUMBERS[0],
    ]);
  });
});
