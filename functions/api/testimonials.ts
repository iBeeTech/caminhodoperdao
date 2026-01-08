/// <reference types="@cloudflare/workers-types" />
import { json, serverError } from "../_utils/responses";

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
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};
