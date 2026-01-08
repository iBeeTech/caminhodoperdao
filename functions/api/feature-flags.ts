/// <reference types="@cloudflare/workers-types" />
import { json, serverError, badRequest, notFound } from "../_utils/responses";

interface Env {
  DB: D1Database;
}

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
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
    const flagName = searchParams.get("name");

    if (!flagName) {
      const response = badRequest("name parameter is required");
      Object.assign(response.headers, corsHeaders);
      return response;
    }

    const { results } = await context.env.DB.prepare(
      `SELECT id, name, enabled, description, created_at, updated_at FROM feature_flags WHERE name = ?`
    ).bind(flagName).all();

    if (!results || results.length === 0) {
      const response = notFound("feature flag not found");
      Object.assign(response.headers, corsHeaders);
      return response;
    }

    const flag = results[0] as unknown as FeatureFlag;
    const response = new Response(
      JSON.stringify({ status: 200, response: "OK", data: flag }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching feature flag:", error);
    return serverError();
  }
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
};
