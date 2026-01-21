import { onRequestGet } from "../../functions/api/whatsapp/next";

describe("WhatsApp Round Robin Endpoint", () => {
  const WA_NUMBERS = [
    "5516982221415",
    "5516999650319",
  ];

  function makeEnv() {
    let counter = 0;
    return {
      WA_COUNTER: {
        idFromName: () => ({}),
        get: () => ({
          fetch: async () => ({
            json: async () => ({ value: counter++ }),
          }),
        }),
      },
    };
  }

  it("deve alternar os números corretamente", async () => {
    const results: string[] = [];
    for (let i = 0; i < 6; i++) {
      const req = new Request("http://localhost/api/whatsapp/next");
      const resp = await onRequestGet({ env: makeEnv(), request: req } as any);
      const data = await resp.json();
      results.push(data.phone);
    }
    expect(results).toEqual([
      WA_NUMBERS[0],
      WA_NUMBERS[1],
      WA_NUMBERS[0],
      WA_NUMBERS[1],
      WA_NUMBERS[0],
      WA_NUMBERS[1],
    ]);
  });
});
