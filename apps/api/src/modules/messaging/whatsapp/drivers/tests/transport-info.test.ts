import { describe, expect, it } from 'vitest';
import { reachInfo, serverDown, TIMEOUT_INFO } from '@/modules/messaging/whatsapp/drivers/transport-info';

describe('transport info', () => {
  it('a refused connection is the line, a dropped one is uncertain', () => {
    expect(reachInfo(false)).toMatchObject({ uncertain: false, lineDown: true });
    expect(reachInfo(true)).toEqual({ code: null, status: 0, uncertain: true });
  });

  it('a timeout is uncertain and marked timed out', () => {
    expect(TIMEOUT_INFO).toMatchObject({ uncertain: true, timedOut: true });
  });

  it('only a 5xx with no provider code is the line', () => {
    expect(serverDown(503, null)).toEqual({ lineDown: true });
    expect(serverDown(503, 131000)).toEqual({});
    expect(serverDown(429, null)).toEqual({});
  });

  it('a gateway 502 or 504 with no provider code is uncertain, never the line', () => {
    expect(serverDown(502, null)).toEqual({ uncertain: true });
    expect(serverDown(504, null)).toEqual({ uncertain: true });
    expect(serverDown(504, 131000)).toEqual({});
  });
});
