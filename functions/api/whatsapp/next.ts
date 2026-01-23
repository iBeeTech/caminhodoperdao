// Endpoint: /api/whatsapp/next


const WA_NUMBERS = [
  "5516982221415",
  "5516999650319",
  "5516999994064",
  "5516992051785",
  "5534992896160",
  "5516999690305",
  "5516999651001",
];
const DEFAULT_MESSAGE = "Olá! Vim pelo site e preciso de ajuda.";

interface Env {
  DB: D1Database;
}


export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const { request } = context;
  try {
    const url = new URL(request.url);
    const message = url.searchParams.get("message") || DEFAULT_MESSAGE;
    const value = await getNextCounter(env.DB);
    const idx = value % WA_NUMBERS.length;
    const phone = WA_NUMBERS[idx];
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    return new Response(
      JSON.stringify({ phone, index: idx, waUrl }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Fallback: primeiro número
    const url = new URL(request.url);
    const message = url.searchParams.get("message") || DEFAULT_MESSAGE;
    const phone = WA_NUMBERS[0];
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    console.error("WA round-robin error", err);
    return new Response(
      JSON.stringify({ phone, index: 0, waUrl, error: true }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  }
};

async function getNextCounter(DB: D1Database): Promise<number> {
  await DB.prepare(
    "INSERT INTO whatsapp_round_robin (id, counter) VALUES (1, 0) ON CONFLICT(id) DO NOTHING"
  ).run();

  try {
    const updated = await DB.prepare(
      "UPDATE whatsapp_round_robin SET counter = counter + 1 WHERE id = 1 RETURNING counter"
    ).first<{ counter: number }>();
    if (typeof updated?.counter === "number") {
      return Math.max(updated.counter - 1, 0);
    }
  } catch (error) {
    console.error("WA round-robin update error", error);
  }

  await DB.prepare("UPDATE whatsapp_round_robin SET counter = counter + 1 WHERE id = 1").run();
  const row = await DB.prepare("SELECT counter FROM whatsapp_round_robin WHERE id = 1").first<{
    counter: number;
  }>();
  return typeof row?.counter === "number" ? Math.max(row.counter - 1, 0) : 0;
}
