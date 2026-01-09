/**
 * GET /api/health/db
 * Database connectivity health check
 * Executes a simple SELECT 1 query to validate D1 connection
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
    const db = context.env?.DB;
    
    if (!db) {
      const durationMs = Date.now() - startTime;
      const response = createHealthResponse(
        {
          status: 'error',
          db: 'error',
          message: 'db_not_configured',
        },
        durationMs
      );
      return createJsonResponse(response, 500);
    }

    // Test DB connection with simple query
    const dbStartTime = Date.now();
    const result = await db.prepare('SELECT 1 as ok').first();
    const dbDurationMs = Date.now() - dbStartTime;

    if (result?.ok === 1) {
      const durationMs = Date.now() - startTime;
      const region = getRegion(context.request);
      
      const response = createHealthResponse(
        {
          status: 'ok',
          db: 'ok',
          db_response_ms: dbDurationMs,
          region,
        },
        durationMs
      );
      return createJsonResponse(response, 200);
    } else {
      throw new Error('Query did not return expected result');
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const response = createHealthResponse(
      {
        status: 'error',
        db: 'error',
        message: 'db_unavailable',
      },
      durationMs
    );
    return createJsonResponse(response, 500);
  }
};

export const onRequest = handler;
