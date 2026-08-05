/// <reference types="@cloudflare/workers-types" />
import { json, serverError } from "../../_utils/responses";
import {
  MAX_FILE_BYTES,
  PhotoUploadEnv,
  REJECTION_MESSAGES,
  buildPhotoKey,
  detectImageFormat,
  rejectionStatus,
  resolveUploadLink,
} from "../../_utils/photoUpload";

/**
 * POST /api/upload-fotos — recebe UMA foto e grava no R2 sem tocar nos bytes.
 *
 * Um arquivo por requisição, de propósito: o fotógrafo manda milhares de fotos
 * por uma internet que cai, e um lote gigante que falha no meio obrigaria a
 * recomeçar tudo. Arquivo a arquivo, o que já subiu está subido, a tela mostra
 * progresso de verdade e o consumo de memória não depende do tamanho do lote.
 *
 * ⚠️ NÃO recomprime nada. O corpo vai para o R2 como chegou — é a razão de a
 * entrega ser por aqui e não por WhatsApp, que destrói a resolução.
 *
 * Sem cabeçalho de CORS de propósito: a página /upload-fotos é do mesmo
 * domínio, e liberar origem em endpoint que ESCREVE só amplia a superfície.
 */
export const onRequestPost: PagesFunction<PhotoUploadEnv> = async (context) => {
  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return json(400, { error: "invalid_form" });
  }

  const token = String(form.get("t") ?? "");
  const file = form.get("file");

  if (!(file instanceof File)) {
    return json(400, { error: "missing_file" });
  }
  if (file.size === 0) {
    return json(400, { error: "empty_file", message: "Arquivo vazio." });
  }
  if (file.size > MAX_FILE_BYTES) {
    return json(413, { error: "file_too_large", message: "Arquivo grande demais." });
  }

  // O tamanho entra na checagem do teto ANTES de gravar: estourar a cota e só
  // então apagar deixaria lixo no balde a cada tentativa.
  const link = await resolveUploadLink(context.env.DB, token, file.size);
  if (typeof link === "string") {
    return json(rejectionStatus(link), { error: link, message: REJECTION_MESSAGES[link] });
  }

  // Confere os bytes do arquivo, não a extensão nem o content-type: os dois vêm
  // de quem envia. Sem isto o link vira hospedagem de qualquer coisa no domínio.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectImageFormat(bytes.subarray(0, 16));
  if (!format) {
    return json(415, {
      error: "not_an_image",
      message: `"${file.name}" não parece ser uma imagem. Envie JPEG, PNG, WebP, HEIC ou TIFF/DNG.`,
    });
  }

  const key = buildPhotoKey(link.event_year, file.name);

  // Reenvio do MESMO arquivo é o caso normal (internet de fotógrafo cai), então
  // não é erro: sobrescreve no R2 e, no banco, o INSERT OR REPLACE mantém uma
  // linha só. O teto usa o delta para o reenvio não contar duas vezes.
  const previous = await context.env.DB.prepare(
    "SELECT size_bytes FROM photo_uploads WHERE r2_key = ?1"
  )
    .bind(key)
    .first<{ size_bytes: number }>();

  try {
    await context.env.PHOTOS.put(key, bytes, {
      httpMetadata: { contentType: file.type || `image/${format}` },
      customMetadata: { originalName: file.name, linkId: link.id },
    });
  } catch {
    return serverError("r2_put_failed");
  }

  const deltaBytes = file.size - (previous?.size_bytes ?? 0);
  const deltaCount = previous ? 0 : 1;

  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT OR REPLACE INTO photo_uploads
         (r2_key, link_id, original_name, size_bytes, content_type, event_year, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))`
    ).bind(key, link.id, file.name, file.size, file.type || null, link.event_year),
    context.env.DB.prepare(
      `UPDATE photo_upload_links
          SET uploaded_bytes = uploaded_bytes + ?1,
              uploaded_count = uploaded_count + ?2,
              last_upload_at = datetime('now')
        WHERE id = ?3`
    ).bind(deltaBytes, deltaCount, link.id),
  ]);

  return json(200, { ok: true, key, replaced: Boolean(previous) });
};
