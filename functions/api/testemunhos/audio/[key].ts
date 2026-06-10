/// <reference types="@cloudflare/workers-types" />

interface Env {
  TESTIMONY_AUDIO: KVNamespace;
}

// Só serve chaves no formato "<uuid>.<ext>" geradas no upload — evita que o
// parâmetro de rota seja usado para varrer o namespace.
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webm|mp4|m4a|mp3|ogg|wav)$/;

// GET /api/testemunhos/audio/:key — devolve o áudio original do testemunho
// (usado no player da página de moderação no admin).
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const key = String(context.params.key ?? "");
  if (!KEY_PATTERN.test(key)) {
    return new Response("Not found", { status: 404 });
  }

  const { value, metadata } = await context.env.TESTIMONY_AUDIO.getWithMetadata<{
    contentType?: string;
  }>(key, { type: "arrayBuffer" });
  if (!value) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(value, {
    status: 200,
    headers: {
      "Content-Type": metadata?.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
};
