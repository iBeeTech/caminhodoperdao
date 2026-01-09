/**
 * GET /api/verse?book=MAT&chapter=5&verse=9
 * ou
 * GET /api/verse?refKey=MAT.5.9
 * Retorna um versículo específico
 */

import bibleData from "../../../src/data/compiled/bible-pt-almeida.json";
import { successResponse, errorResponse } from "../../_utils/verse";

interface VerseResponse {
  refKey: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
}

export const onRequest: PagesFunction = async (context) => {
  // CORS preflight
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (context.request.method !== "GET") {
    return errorResponse("Método não permitido. Use GET.", 405);
  }

  try {
    const url = new URL(context.request.url);
    const refKey = url.searchParams.get("refKey");
    const book = url.searchParams.get("book");
    const chapter = url.searchParams.get("chapter");
    const verse = url.searchParams.get("verse");

    let targetRefKey: string | null = null;

    if (refKey) {
      // Lookup por refKey direto (ex: MAT.5.9)
      targetRefKey = refKey.toUpperCase();
    } else if (book && chapter && verse) {
      // Lookup por book/chapter/verse
      targetRefKey = `${book.toUpperCase()}.${chapter}.${verse}`;
    } else {
      return errorResponse(
        'Parâmetros inválidos. Use ?refKey=MAT.5.9 ou ?book=MAT&chapter=5&verse=9',
        400
      );
    }

    const found = bibleData.verses.find((v) => v.refKey === targetRefKey);

    if (!found) {
      return errorResponse(
        `Versículo não encontrado: ${targetRefKey}`,
        404
      );
    }

    const response: VerseResponse = {
      refKey: found.refKey,
      book: found.book,
      chapter: found.chapter,
      verse: found.verse,
      text: found.text,
      reference: `${found.book} ${found.chapter}:${found.verse}`,
    };

    return successResponse(response, 200);
  } catch (error) {
    console.error("Erro ao buscar versículo específico:", error);
    return errorResponse("Erro interno do servidor", 500);
  }
};
