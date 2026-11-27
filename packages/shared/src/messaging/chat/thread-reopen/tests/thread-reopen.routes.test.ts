import { describe, expect, it } from 'vitest';
import { threadReopenRoutes as routes } from '..';

describe('threadReopenRoutes', () => {
  it('keeps the path old app builds call', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['POST /threads/:phone/reopen']);
  });

  it('names the chat by any spelling of its E.164 number', () => {
    expect(routes.reopen.params.parse({ phone: '+966501234567' })).toEqual({
      phone: '+966501234567',
    });
    expect(routes.reopen.params.safeParse({ phone: 'abc' }).success).toBe(false);
  });

  it('answers the window state and never a queued template', () => {
    const open = { kapso_reopened: false, template: 'window_open' };
    expect(routes.reopen.response.parse(open)).toEqual(open);
    const queued = { kapso_reopened: false, template: 'queued' };
    expect(routes.reopen.response.safeParse(queued).success).toBe(false);
  });
});
