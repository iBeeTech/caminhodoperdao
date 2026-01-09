/**
 * GET /api/verse/random
 * Retorna um versículo aleatório
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
    if (!bibleData.verses || bibleData.verses.length === 0) {
      return errorResponse("Nenhum versículo disponível", 500);
    }

    // Seleciona um versículo aleatório
    const randomIndex = Math.floor(Math.random() * bibleData.verses.length);
    const verse = bibleData.verses[randomIndex];

    const response: VerseResponse = {
      refKey: verse.refKey,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      reference: `${verse.book} ${verse.chapter}:${verse.verse}`,
    };

    return successResponse(response, 200);
  } catch (error) {
    console.error("Erro ao buscar versículo aleatório:", error);
    return errorResponse("Erro interno do servidor", 500);
  }
};
