import { describe, expect, it } from 'vitest';
import { activitySessionRoutes as routes } from '..';

describe('activitySessionRoutes', () => {
  it('keeps the three report paths of today under the activity tag', () => {
    const lines = Object.values(routes).map((route) => `${route.method} ${route.path}`);
    expect(lines).toEqual([
      'POST /activity/session/login',
      'POST /activity/session/logout',
      'POST /activity/session/login-failed',
    ]);
    for (const route of Object.values(routes)) expect(route.tags).toEqual(['activity']);
  });

  it('takes no body and answers nothing, so no sign-in value ever travels', () => {
    for (const route of Object.values(routes)) {
      expect(route).not.toHaveProperty('body');
      expect(route.response).toBe('empty');
    }
  });

  it('needs no permission: a signed-in user or, for a failed sign-in, nobody', () => {
    for (const route of Object.values(routes)) expect(route).not.toHaveProperty('permissions');
  });
});
