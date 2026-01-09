/**
 * GET /api/health/pix
 * Payment provider (PIX/Woovi) health check
 * Validates configuration and optionally tests connectivity
 */

import {
  validateHealthRequest,
  createHealthResponse,
  createJsonResponse,
  getRegion,
} from '../../_utils/health';

const handler = async (context: any) => {
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
    const appId = context.env?.WOOVI_APP_ID;

    // Check if PIX is configured
    if (!appId) {
      const durationMs = Date.now() - startTime;
      const response = createHealthResponse(
        {
          status: 'ok',
          pix: 'not_configured',
          message: 'pix_integration_disabled',
        },
        durationMs
      );
      return createJsonResponse(response, 200);
    }

    // PIX is configured - for now, just return ok
    // (We don't make external calls to avoid creating charges or excessive API calls)
    const durationMs = Date.now() - startTime;
    const region = getRegion(context.request);

    const response = createHealthResponse(
      {
        status: 'ok',
        pix: 'configured',
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
        pix: 'error',
        message: 'pix_check_failed',
      },
      durationMs
    );
    return createJsonResponse(response, 500);
  }
};

export const onRequest = handler;
