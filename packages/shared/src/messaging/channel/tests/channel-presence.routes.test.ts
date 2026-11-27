import { describe, expect, it } from 'vitest';
import { channelPresenceRoutes as routes } from '../channel-presence.routes';

const ID = 'a1111111-1111-4111-8111-111111111111';
const PEER = { profile_id: 'p-t1', role: 'teacher', last_seen_at: '2026-10-30T09:00:00.000Z' };

describe('channelPresenceRoutes', () => {
  it('keeps the four paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /teachers/me/channels/:id/presence',
      'GET /portal/students/:id/channel/presence',
      'GET /students/:id/channel/presence',
      'GET /sales/students/:id/channel/presence',
    ]);
  });

  it('takes the student id and refuses anything else', () => {
    expect(routes.teacher.params.parse({ id: ID })).toEqual({ id: ID });
    expect(routes.portal.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(routes.monitor.params.safeParse({}).success).toBe(false);
  });

  it('answers whether presence is on and the people the caller may see', () => {
    const body = { enabled: true, peers: [PEER] };
    expect(routes.sales.response.parse(body)).toEqual(body);
    expect(routes.monitor.response.parse({ enabled: false, peers: [] }).peers).toEqual([]);
    expect(routes.portal.response.safeParse({ peers: [PEER] }).success).toBe(false);
  });

  it('lets each audience in by its own permission under the student-channels tag', () => {
    const access = Object.values(routes).map((r) => [r.permissions, r.tags]);
    const tag = ['student-channels'];
    expect(access).toEqual([
      [['self.teacher'], tag],
      [['self.portal'], tag],
      [['student_channels.monitor'], tag],
      [['self.sales'], tag],
    ]);
  });
});
