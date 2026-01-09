/**
 * Health check utilities for monitoring endpoints
 * Provides rate limiting, token validation, response helpers
 */

import type { Request } from '@cloudflare/workers-types';

// Simple in-memory rate limiter (best-effort, resets when worker restarts)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

/**
 * Extract client IP from request
 */
export function getClientIp(request: any): string {
  const cfIp = request.headers.get('CF-Connecting-IP');
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  return cfIp || xForwardedFor || 'unknown';
}

/**
 * Check if client has exceeded rate limit
 * Returns true if request should be blocked
 */
export function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientIp) || [];
  
  // Remove old timestamps outside the window
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  // Check if exceeded limit
  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  // Record this request
  recentTimestamps.push(now);
  rateLimitMap.set(clientIp, recentTimestamps);
  
  return false;
}

/**
 * Extract monitor token from request (header or query param)
 */
export function getMonitorToken(request: any): string | null {
  const url = new URL(request.url);
  return request.headers.get('x-monitor-token') || url.searchParams.get('token');
}

/**
 * Validate monitor token against env variable
 */
export function validateMonitorToken(
  providedToken: string | null,
  envToken: string | undefined
): boolean {
  // If no env token is set, allow all requests
  if (!envToken) {
    return true;
  }
  
  // If env token is set, provided token must match
  if (!providedToken) {
    return false;
  }
  
  return providedToken === envToken;
}

/**
 * Get Cloudflare colo/region from request
 */
export function getRegion(request: any): string {
  const cf = request.cf as any;
  return cf?.colo || 'unknown';
}

/**
 * Create standardized health response
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  service?: string;
  version?: string;
  timestamp_ms?: number;
  duration_ms: number;
  region?: string;
  [key: string]: any;
}

export function createHealthResponse(
  data: Partial<HealthResponse>,
  durationMs: number
): HealthResponse {
  return {
    ...data,
    duration_ms: durationMs,
    timestamp_ms: Date.now(),
  };
}

/**
 * Create JSON response with appropriate status code
 */
export function createJsonResponse(
  data: any,
  statusCode: number = 200,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      ...headers,
    },
  });
}

/**
 * Create error response
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  additionalData?: Record<string, any>
): Response {
  const response = createHealthResponse(
    {
      status: 'error',
      message,
      ...additionalData,
    },
    0 // Will be calculated by handler
  );
  
  return createJsonResponse(response, statusCode);
}

/**
 * Middleware: Check rate limit and token
 * Returns Response if validation fails, null if OK
 */
export function validateHealthRequest(
  request: any,
  monitorToken?: string
): Response | null {
  const clientIp = getClientIp(request);
  
  // Check rate limit
  if (isRateLimited(clientIp)) {
    return createJsonResponse(
      createHealthResponse(
        {
          status: 'error',
          message: 'rate_limited',
        },
        0
      ),
      429
    );
  }
  
  // Check token
  const providedToken = getMonitorToken(request);
  if (!validateMonitorToken(providedToken, monitorToken)) {
    return createJsonResponse(
      createHealthResponse(
        {
          status: 'error',
          message: 'unauthorized',
        },
        0
      ),
      401
    );
  }
  
  return null;
}

/**
 * Wrap handler with timing
 */
export async function measureHandler(
  handler: () => Promise<Response>
): Promise<Response> {
  const startTime = Date.now();
  const response = await handler();
  const durationMs = Date.now() - startTime;
  
  // Try to inject duration into response if it's JSON
  if (response.headers.get('Content-Type')?.includes('application/json')) {
    try {
      const json = await response.clone().json();
      if (json && typeof json === 'object') {
        json.duration_ms = durationMs;
        return createJsonResponse(json, response.status);
      }
    } catch {
      // If not parseable, just return response as-is
    }
  }
  
  return response;
}
