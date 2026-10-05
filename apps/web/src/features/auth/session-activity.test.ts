import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportSession } from './session-activity';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiSend }));

describe('reportSession («سجل النشاط»)', () => {
  beforeEach(() => {
    apiSend.mockReset();
  });

  it('posts the event with no body (no email, no password)', async () => {
    apiSend.mockResolvedValue(undefined);
    await reportSession('login-failed');
    expect(apiSend).toHaveBeenCalledWith('POST', '/activity/session/login-failed');
  });

  it('never throws when the API is down or refuses', async () => {
    apiSend.mockImplementation(() => Promise.reject(new Error('429')));
    await reportSession('logout');
    expect(apiSend).toHaveBeenCalledWith('POST', '/activity/session/logout');
  });
});
