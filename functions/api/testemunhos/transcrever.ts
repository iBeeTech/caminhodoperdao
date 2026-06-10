/// <reference types="@cloudflare/workers-types" />
import { badRequest, serverError } from "../../_utils/responses";

// Binding mínimo do Workers AI (evita depender do tipo `Ai` por modelo).
interface WorkersAi {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

interface Env {
  TESTIMONY_AUDIO: KVNamespace;
  AI: WorkersAi;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// O front limita a gravação a 3 minutos; 8 MB cobre 3 min de voz com folga
// (webm/opus ~1,5 MB; mp4/aac do iPhone ~3 MB) e barra abusos.
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

const WHISPER_MODEL = "@cf/openai/whisper-large-v3-turbo";

function resolveExtension(contentType: string): string | null {
  // MediaRecorder costuma anexar codecs, ex.: "audio/webm;codecs=opus".
  const baseType = contentType.split(";")[0].trim().toLowerCase();
  return EXTENSION_BY_CONTENT_TYPE[baseType] ?? null;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// POST /api/testemunhos/transcrever — recebe o áudio gravado (multipart, campo
// "audio"), guarda no R2 e transcreve com Whisper. O texto volta para a pessoa
// revisar antes de enviar o testemunho em POST /api/testemunhos.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return badRequest("invalid_form_data");
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return badRequest("audio_required");
  }

  if (audio.size === 0) return badRequest("audio_empty");
  if (audio.size > MAX_AUDIO_BYTES) return badRequest("audio_too_large");

  const contentType = audio.type || "audio/webm";
  const extension = resolveExtension(contentType);
  if (!extension) return badRequest("unsupported_audio_type");

  const audioKey = `${crypto.randomUUID()}.${extension}`;
  const buffer = await audio.arrayBuffer();

  try {
    // KV guarda o áudio (valor até 25 MB; nosso teto é 8 MB) com o content-type
    // nos metadados para o player da moderação reproduzir corretamente.
    await context.env.TESTIMONY_AUDIO.put(audioKey, buffer, {
      metadata: { contentType },
    });
  } catch (error) {
    console.error("Error storing testimony audio:", (error as Error).message);
    return serverError("audio_store_failed");
  }

  // Falha na transcrição não bloqueia o fluxo: o áudio já está salvo e a
  // pessoa pode digitar o texto manualmente.
  let transcript = "";
  let transcriptionFailed = false;
  try {
    const result = (await context.env.AI.run(WHISPER_MODEL, {
      audio: toBase64(buffer),
      language: "pt",
    })) as { text?: string };
    transcript = (result?.text ?? "").trim();
    if (!transcript) transcriptionFailed = true;
  } catch (error) {
    console.error("Error transcribing testimony audio:", (error as Error).message);
    transcriptionFailed = true;
  }

  return new Response(
    JSON.stringify({
      success: true,
      audioKey,
      audioContentType: contentType,
      transcript,
      transcriptionFailed,
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};
