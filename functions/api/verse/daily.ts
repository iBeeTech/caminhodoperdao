/**
 * GET /api/verse/daily?date=YYYY-MM-DD
 * Retorna um versículo determinístico para o dia
 * Mesma data = sempre o mesmo versículo
 */

import bibleData from "../../../src/data/compiled/bible-pt-almeida.json";
import { successResponse, errorResponse, getDeterministicIndex } from "../../_utils/verse";

interface VerseResponse {
  refKey: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
  date: string;
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
    let dateStr = url.searchParams.get("date");

    // Se não informar data, usa a data de hoje
    if (!dateStr) {
      const today = new Date();
      dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    }

    // Valida formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return errorResponse(
        'Formato de data inválido. Use YYYY-MM-DD (ex: 2026-01-09)',
        400
      );
    }

    if (!bibleData.verses || bibleData.verses.length === 0) {
      return errorResponse("Nenhum versículo disponível", 500);
    }

    // Seleciona versículo baseado no hash da data (determinístico)
    const index = getDeterministicIndex(dateStr, bibleData.verses.length);
    const verse = bibleData.verses[index];

    const response: VerseResponse = {
      refKey: verse.refKey,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      reference: `${verse.book} ${verse.chapter}:${verse.verse}`,
      date: dateStr,
    };

    return successResponse(response, 200);
  } catch (error) {
    console.error("Erro ao buscar versículo do dia:", error);
    return errorResponse("Erro interno do servidor", 500);
  }
};
