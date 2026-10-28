import { describe, expect, it } from 'vitest';
import { closedPath } from './role-http';

describe('closedPath: what each role serves', () => {
  it('worker: /health and the kick route only', () => {
    expect(closedPath('worker', '/health')).toBe(false);
    expect(closedPath('worker', '/health?x=1')).toBe(false);
    expect(closedPath('worker', '/internal/jobs/message-sender/kick')).toBe(false);
    for (const url of [
      '/',
      '/auth/login',
      '/webhooks/whatsapp',
      '/docs',
      '/healthz',
      '/internal/other',
    ]) {
      expect(closedPath('worker', url)).toBe(true);
    }
  });

  it('api and all: every public route, never /internal but the peer config reload', () => {
    for (const role of ['api', 'all'] as const) {
      expect(closedPath(role, '/health')).toBe(false);
      expect(closedPath(role, '/webhooks/whatsapp')).toBe(false);
      expect(closedPath(role, '/internal/jobs/message-sender/kick')).toBe(true);
      expect(closedPath(role, '/%69nternal/jobs/report-pdf/kick')).toBe(true);
      expect(closedPath(role, '/auth/%E0%A4%A')).toBe(false);
      expect(closedPath(role, '/internal/jobs/config-reload/here')).toBe(false);
      expect(closedPath(role, '/internal/jobs/config-reload/kick')).toBe(true);
    }
  });
});
