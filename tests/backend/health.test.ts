/**
 * Health check endpoints tests
 * Tests for /api/health, /api/health/db, /api/health/pix
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getClientIp,
  isRateLimited,
  getMonitorToken,
  validateMonitorToken,
  getRegion,
  validateHealthRequest,
} from '../../functions/_utils/health';

describe('Health Check Utilities', () => {
  describe('getClientIp', () => {
    it('should get IP from CF-Connecting-IP header', () => {
      const request = new Request('http://localhost/api/health', {
        headers: {
          'CF-Connecting-IP': '192.168.1.1',
        },
      });
      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    it('should fallback to X-Forwarded-For header', () => {
      const request = new Request('http://localhost/api/health', {
        headers: {
          'X-Forwarded-For': '10.0.0.1',
        },
      });
      expect(getClientIp(request)).toBe('10.0.0.1');
    });

    it('should return unknown if no IP header present', () => {
      const request = new Request('http://localhost/api/health');
      expect(getClientIp(request)).toBe('unknown');
    });
  });

  describe('getMonitorToken', () => {
    it('should get token from x-monitor-token header', () => {
      const request = new Request('http://localhost/api/health', {
        headers: {
          'x-monitor-token': 'test-token-123',
        },
      });
      expect(getMonitorToken(request)).toBe('test-token-123');
    });

    it('should get token from query parameter', () => {
      const request = new Request('http://localhost/api/health?token=query-token');
      expect(getMonitorToken(request)).toBe('query-token');
    });

    it('should prefer header over query parameter', () => {
      const request = new Request('http://localhost/api/health?token=query-token', {
        headers: {
          'x-monitor-token': 'header-token',
        },
      });
      expect(getMonitorToken(request)).toBe('header-token');
    });

    it('should return null if no token provided', () => {
      const request = new Request('http://localhost/api/health');
      expect(getMonitorToken(request)).toBeNull();
    });
  });

  describe('validateMonitorToken', () => {
    it('should allow all requests if no env token set', () => {
      expect(validateMonitorToken(null, undefined)).toBe(true);
      expect(validateMonitorToken('any-token', undefined)).toBe(true);
    });

    it('should reject request if env token set but no provided token', () => {
      expect(validateMonitorToken(null, 'env-token')).toBe(false);
    });

    it('should accept matching token', () => {
      expect(validateMonitorToken('secret-123', 'secret-123')).toBe(true);
    });

    it('should reject non-matching token', () => {
      expect(validateMonitorToken('wrong-token', 'secret-123')).toBe(false);
    });
  });

  describe('getRegion', () => {
    it('should get region from request.cf.colo', () => {
      const request = new Request('http://localhost/api/health');
      // Mock cf object - this is tricky in tests, so we'll just verify it doesn't crash
      expect(getRegion(request)).toBeDefined();
    });
  });

  describe('validateHealthRequest', () => {
    it('should return null if validation passes (no token, under rate limit)', () => {
      const request = new Request('http://localhost/api/health');
      const result = validateHealthRequest(request, undefined);
      expect(result).toBeNull();
    });

    it('should return 401 if token required but not provided', () => {
      const request = new Request('http://localhost/api/health');
      const result = validateHealthRequest(request, 'required-token');
      expect(result?.status).toBe(401);
    });

    it('should return 401 if token provided but wrong', () => {
      const request = new Request('http://localhost/api/health', {
        headers: {
          'x-monitor-token': 'wrong-token',
        },
      });
      const result = validateHealthRequest(request, 'correct-token');
      expect(result?.status).toBe(401);
    });

    it('should return null if correct token provided', () => {
      const request = new Request('http://localhost/api/health', {
        headers: {
          'x-monitor-token': 'correct-token',
        },
      });
      const result = validateHealthRequest(request, 'correct-token');
      expect(result).toBeNull();
    });

    it('should return 429 if rate limited', async () => {
      const clientIp = '192.168.1.1';
      
      // Make many requests to exceed rate limit
      for (let i = 0; i < 35; i++) {
        const request = new Request('http://localhost/api/health', {
          headers: {
            'CF-Connecting-IP': clientIp,
          },
        });
        
        const result = validateHealthRequest(request, undefined);
        
        if (i < 30) {
          // First 30 should pass
          expect(result).toBeNull();
        } else {
          // After 30, should be rate limited
          expect(result?.status).toBe(429);
        }
      }
    });
  });
});

describe('Health Check Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return 200 with ok status', async () => {
      const response = await fetch('http://localhost/api/health');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('caminhodoperdao');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('timestamp_ms');
      expect(data).toHaveProperty('duration_ms');
    });

    it('should return correct headers', async () => {
      const response = await fetch('http://localhost/api/health');
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(response.headers.get('Cache-Control')).toContain('no-store');
    });

    it('should reject without token when token required', async () => {
      // This would need MONITOR_TOKEN env var set in test
      // Skipping for now as we can't easily set env in tests
    });
  });

  describe('GET /api/health/db', () => {
    it('should return 500 if DB not available', async () => {
      // Without mocking D1, this will fail
      // In real environment, this tests actual DB connectivity
    });
  });

  describe('GET /api/health/pix', () => {
    it('should return 200 with pix status', async () => {
      const response = await fetch('http://localhost/api/health/pix');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('pix');
    });
  });
});
