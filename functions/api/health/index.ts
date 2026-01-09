/**
 * GET /api/health
 * General application health check endpoint
 * Returns basic status and metadata about the service
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import {
  validateHealthRequest,
  createHealthResponse,
  createJsonResponse,
  getRegion,
} from '../../_utils/health';

interface HealthEnv {
  MONITOR_TOKEN?: string;
}

const handler: PagesFunction<HealthEnv> = async (context) => {
  const startTime = Date.now();
  
  // Validate request (rate limit + token)
  const validationError = validateHealthRequest(
    context.request,
    context.env?.MONITOR_TOKEN
  );
  if (validationError) {
    return validationError;
  }

  try {
    const durationMs = Date.now() - startTime;
    const region = getRegion(context.request);

    // Get package version from wrangler env or fallback
    const version = context.env?.SERVICE_VERSION || '1.0.0';

    const response = createHealthResponse(
      {
        status: 'ok',
        service: 'caminhodoperdao',
        version,
        region,
      },
      durationMs
    );

    return createJsonResponse(response, 200);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const response = createHealthResponse(
      {
        status: 'error',
        message: 'internal_error',
      },
      durationMs
    );
    return createJsonResponse(response, 500);
  }
};

export const onRequest = handler;
