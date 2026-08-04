/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, notFound, serverError } from "../../_utils/responses";
import { UserAuthEnv, authorizeUserRequest } from "../../_utils/userAuth";

type Env = UserAuthEnv & { PROFILE_PHOTO: KVNamespace };

/**
 * Foto de perfil: guardar, servir e apagar.
 *
 * O binário vive no KV (`photo:<user_id>`), não no D1. Imagem em coluna de banco
 * engorda toda consulta que faz `SELECT *` e transforma um backup de texto num
 * despejo de megabytes.
 *
 * ⚠️ O tamanho é cortado no NAVEGADOR (256px, JPEG), antes de subir. Aqui o
 * limite abaixo é a rede de segurança contra quem não passa pela tela — não é a
 * primeira linha de defesa. Sem ele, um POST à mão encheria o KV.
 */

/** 256px em JPEG dá ~25 KB. 200 KB é folga larga, e ainda barra abuso. */
const MAX_BYTES = 200 * 1024;

const ALLOWED_PREFIXES = ["data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,"];

function keyFor(userId: string): string {
  return `photo:${userId}`;
}

/** Serve a foto da pessoa logada. */
export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const stored = await context.env.PROFILE_PHOTO.get(keyFor(auth.sub), "text");
    if (!stored) return notFound("no_photo");

    const commaAt = stored.indexOf(",");
    const contentType = stored.slice(5, stored.indexOf(";"));
    const bytes = Uint8Array.from(atob(stored.slice(commaAt + 1)), char => char.charCodeAt(0));

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Privado e curto: é foto de rosto de uma pessoa identificada, então
        // não pode ficar em cache compartilhado de CDN nem de proxy.
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("GET /api/me/photo falhou:", error);
    return serverError();
  }
};

/** Recebe a foto já reduzida pela tela, como data URL. */
export const onRequestPost: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { dataUrl?: unknown } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  if (!ALLOWED_PREFIXES.some(prefix => dataUrl.startsWith(prefix))) {
    return badRequest("invalid_image");
  }

  // Base64 cresce ~4/3 sobre o binário. Comparar o tamanho do texto já barra o
  // exagero sem precisar decodificar nada antes de saber que é grande demais.
  const approximateBytes = Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
  if (approximateBytes > MAX_BYTES) return badRequest("image_too_large");

  try {
    const now = Date.now();
    await context.env.PROFILE_PHOTO.put(keyFor(auth.sub), dataUrl);
    await context.env.DB.prepare(
      "UPDATE users SET photo_updated_at = ?2, updated_at = ?2 WHERE id = ?1"
    )
      .bind(auth.sub, now)
      .run();

    return json(200, { hasPhoto: true, photoUpdatedAt: now });
  } catch (error) {
    console.error("POST /api/me/photo falhou:", error);
    return serverError();
  }
};

export const onRequestDelete: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    await context.env.PROFILE_PHOTO.delete(keyFor(auth.sub));
    await context.env.DB.prepare(
      "UPDATE users SET photo_updated_at = NULL, updated_at = ?2 WHERE id = ?1"
    )
      .bind(auth.sub, Date.now())
      .run();

    return json(200, { hasPhoto: false });
  } catch (error) {
    console.error("DELETE /api/me/photo falhou:", error);
    return serverError();
  }
};
