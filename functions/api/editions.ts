/// <reference types="@cloudflare/workers-types" />
import { serverError } from "../_utils/responses";

type Env = { DB: D1Database };

/**
 * Quantos peregrinos caminharam em cada edição.
 *
 * Alimenta o balãozinho da estrada. Público de propósito: é número agregado, do
 * tipo que já sai em cartaz e em post de rede social — nenhum nome, nenhuma
 * cidade, nenhuma pessoa identificável.
 *
 * Lê as DUAS tabelas: `registrations` (o ano corrente) e `registrations_old`
 * (2026, arquivada na migration 027). Só a primeira existiria hoje, e ela está
 * vazia — o balão mostraria "sem dados" justamente no único ano de que temos
 * número.
 *
 * ⚠️ Conta só `PAID`. Pendente é vaga reservada que pode vencer em 24h, e
 * cancelado não caminhou: somar os dois inflaria o número que a tela apresenta
 * como "quantos caminharam".
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  try {
    const { results } = await context.env.DB.prepare(
      `SELECT event_year AS year, COUNT(*) AS total FROM (
         SELECT event_year FROM registrations      WHERE status = 'PAID' AND event_year IS NOT NULL
         UNION ALL
         SELECT event_year FROM registrations_old  WHERE status = 'PAID' AND event_year IS NOT NULL
       )
       GROUP BY event_year`
    ).all<{ year: number; total: number }>();

    const participants: Record<string, number> = {};
    for (const row of results ?? []) participants[String(row.year)] = row.total;

    return new Response(JSON.stringify({ participants }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Número de edição encerrada não muda. Uma hora de cache evita uma
        // consulta ao banco por visita à estrada.
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    // `registrations_old` pode não existir num banco recriado do schema.sql.
    // A estrada não pode sumir por causa disso: sem número, o balão só deixa de
    // mostrar a linha de participantes.
    console.error("GET /api/editions falhou:", error);
    return serverError();
  }
};
