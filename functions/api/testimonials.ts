/// <reference types="@cloudflare/workers-types" />
import { badRequest, serverError } from "../_utils/responses";

interface Env {
  DB: D1Database;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  image?: string;
  rating?: number;
  featured: number;
  created_at: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function clamp(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export const onRequestGet = async (context: {
  env: Env;
  request: Request;
}): Promise<Response> => {
  try {
    const { searchParams } = new URL(context.request.url);
    const featured = searchParams.get("featured");

    let query = `
      SELECT id, name, role, content, image, rating, featured, created_at
      FROM testimonials
    `;

    if (featured === "true") {
      query += ` WHERE featured = 1`;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await context.env.DB.prepare(query).all();

    if (!result.success) {
      return serverError("Failed to fetch testimonials");
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: (result.results || []) as unknown as Testimonial[],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return serverError("Internal server error");
  }
};

// Recebe um depoimento enviado pelo público (página /depoimentos).
// Entra como featured=0 e fica visível na listagem (home e /depoimentos).
export const onRequestPost = async (context: {
  env: Env;
  request: Request;
}): Promise<Response> => {
  try {
    let payload: { name?: string; role?: string; content?: string; rating?: number };
    try {
      payload = await context.request.json();
    } catch {
      return badRequest("invalid_json");
    }

    const name = clamp(String(payload.name ?? ""), 80);
    const content = clamp(String(payload.content ?? ""), 1000);
    const roleRaw = clamp(String(payload.role ?? ""), 80);
    const role = roleRaw || "Peregrino(a)";

    if (name.length < 2) return badRequest("name_required");
    if (content.length < 5) return badRequest("content_required");

    let rating = Number(payload.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) rating = 5;

    const id = crypto.randomUUID();

    const result = await context.env.DB.prepare(
      `INSERT INTO testimonials (id, name, role, content, rating, featured)
       VALUES (?, ?, ?, ?, ?, 0)`
    )
      .bind(id, name, role, content, rating)
      .run();

    if (!result.success) {
      return serverError("Failed to save testimonial");
    }

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error saving testimonial:", error);
    return serverError("Internal server error");
  }
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};
