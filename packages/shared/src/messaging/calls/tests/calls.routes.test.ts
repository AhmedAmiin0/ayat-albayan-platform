import { describe, expect, it } from 'vitest';
import { callsRoutes as routes } from '../..';

const ID = '00000000-0000-4000-8000-000000000001';
const AT = '2026-10-01T10:00:00.123456+00:00';
const CALL = {
  id: ID,
  phone_e164: '+966500000001',
  direction: 'outbound',
  status: 'ended',
  end_reason: 'completed',
  display_name: null,
  staff_id: ID,
  started_at: AT,
  answered_at: AT,
  ended_at: AT,
  duration_seconds: 7,
};
const ACTIVE = { ...CALL, status: 'ringing', end_reason: null, offer_sdp: null, answer_sdp: 'v=0' };

describe('callsRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /calls/config',
      'GET /calls/active',
      'GET /calls',
      'POST /calls',
      'POST /calls/:id/accept',
      'POST /calls/:id/reject',
      'POST /calls/:id/end',
      'GET /calls/permission/:phone',
    ]);
  });

  it('answers the config with the ICE servers, TURN credentials optional', () => {
    const stun = { urls: ['stun:stun.l.google.com:19302'] };
    const turn = { urls: ['turn:t.example:3478'], username: 'u', credential: 'c' };
    const config = { enabled: true, available: true, canCall: true, iceServers: [stun, turn] };
    expect(routes.config.response.parse(config)).toEqual(config);
    expect(routes.config.response.safeParse({ ...config, canCall: 'yes' }).success).toBe(false);
  });

  it('answers the log and the live calls, refusing an unknown status or a bad number', () => {
    expect(routes.list.response.parse([CALL])).toEqual([CALL]);
    expect(routes.active.response.parse([ACTIVE])).toEqual([ACTIVE]);
    expect(routes.list.response.safeParse([{ ...CALL, status: 'held' }]).success).toBe(false);
    expect(routes.list.response.safeParse([{ ...CALL, phone_e164: 'x' }]).success).toBe(false);
    expect(routes.active.response.safeParse([CALL]).success).toBe(false);
  });

  it('reads the log of one chat or of all, 50 by default', () => {
    expect(routes.list.query.parse({})).toEqual({ limit: 50 });
    expect(routes.list.query.parse({ phone: '+966500000001', limit: '100' })).toEqual({
      phone: '+966500000001',
      limit: 100,
    });
    expect(routes.list.query.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('acts on a call by its uuid and answers the live call', () => {
    const acts = [routes.accept, routes.reject, routes.end];
    expect(acts.map((r) => r.params.safeParse({ id: 'm1' }).success)).toEqual([false, false, false]);
    expect(acts.map((r) => r.params.parse({ id: ID }))).toEqual([{ id: ID }, { id: ID }, { id: ID }]);
    expect(routes.start.response.parse(ACTIVE)).toEqual(ACTIVE);
    expect(routes.accept.body.safeParse({ sdp: 'hello' }).success).toBe(false);
  });

  it('answers a number permission with its state and the stored reply', () => {
    const reply = { response: 'accepted', at: AT, expires_at: null };
    const view = { state: 'granted', expires_at: null, via: 'template', reply };
    expect(routes.permission.params.parse({ phone: '+966500000001' })).toBeTruthy();
    expect(routes.permission.response.parse(view)).toEqual(view);
    expect(routes.permission.response.parse({ state: 'request', expires_at: null })).toBeTruthy();
    expect(routes.permission.response.safeParse({ ...view, state: 'maybe' }).success).toBe(false);
  });

  it('lets inbox.read read and inbox.send act, each tagged calls', () => {
    const access = Object.values(routes).map((r) => [r.permissions, r.tags]);
    const read = [['inbox.read'], ['calls']];
    const send = [['inbox.send'], ['calls']];
    expect(access).toEqual([read, read, read, send, send, send, send, send]);
  });
});
