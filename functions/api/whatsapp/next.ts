// Endpoint: /api/whatsapp/next


const WA_NUMBERS = [
  "5516982221415",
  "5516999650319",
];
const DEFAULT_MESSAGE = "Olá! Vim pelo site e preciso de ajuda.";


export const onRequestGet: PagesFunction = async (context) => {
  const env = (context.env as any) as { WA_COUNTER: DurableObjectNamespace };
  const { request } = context;
  try {
    const url = new URL(request.url);
    const message = url.searchParams.get("message") || DEFAULT_MESSAGE;
    const id = env.WA_COUNTER.idFromName("global");
    const stub = env.WA_COUNTER.get(id);
    const resp = await stub.fetch("https://wa-counter/next");
    const data = (await resp.json()) as { value: number };
    const idx = data.value % WA_NUMBERS.length;
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
