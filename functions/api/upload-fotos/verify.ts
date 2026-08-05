/// <reference types="@cloudflare/workers-types" />
import { json } from "../../_utils/responses";
import {
  PhotoUploadEnv,
  REJECTION_MESSAGES,
  rejectionStatus,
  resolveUploadLink,
} from "../../_utils/photoUpload";

/**
 * GET /api/upload-fotos/verify?t=<token>
 *
 * A página chama isto ao abrir. Serve para o fotógrafo descobrir que o link
 * venceu ANTES de selecionar 3 mil arquivos e esperar o primeiro envio falhar.
 *
 * Não devolve nada sensível: só o rótulo do link, o ano e quanto já subiu, que
 * é o que a tela precisa mostrar para ele saber que está no lugar certo.
 */
export const onRequestGet: PagesFunction<PhotoUploadEnv> = async (context) => {
  const token = new URL(context.request.url).searchParams.get("t") ?? "";
  const link = await resolveUploadLink(context.env.DB, token);

  if (typeof link === "string") {
    return json(rejectionStatus(link), { ok: false, reason: link, message: REJECTION_MESSAGES[link] });
  }

  return json(200, {
    ok: true,
    label: link.label,
    eventYear: link.event_year,
    expiresAt: link.expires_at,
    uploadedCount: link.uploaded_count,
    uploadedBytes: link.uploaded_bytes,
    maxBytes: link.max_bytes,
  });
};
