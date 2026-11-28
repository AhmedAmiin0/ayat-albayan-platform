import { describe, expect, it } from 'vitest';
import { internalJobRoutes as routes } from './jobs.routes';

describe('internalJobRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'POST /internal/jobs/:name/kick',
      'POST /internal/jobs/config-reload/here',
    ]);
  });

  it('answers with no body and asks no permission: the internal token is checked inside', () => {
    for (const route of Object.values(routes)) {
      expect(route.response).toBe('empty');
      expect(route.isPublic).toBe(true);
      expect(route).not.toHaveProperty('permissions');
      expect(route).not.toHaveProperty('body');
    }
  });

  it('takes a job name and the kick query of today', () => {
    expect(routes.kick.params.parse({ name: 'outbox' })).toEqual({ name: 'outbox' });
    expect(routes.kick.query.parse({ lane: 'chat', wait: '0' })).toEqual({
      lane: 'chat',
      wait: '0',
    });
    expect(routes.kick.query.safeParse({ wait: 'yes' }).success).toBe(false);
    expect(routes.kick.query.safeParse({ lane: 'Chat!' }).success).toBe(false);
  });
});
