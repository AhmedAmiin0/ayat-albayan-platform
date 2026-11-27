import { describe, expect, it } from 'vitest';
import { meetingInviteRoutes as routes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const STAFF = { kind: 'staff', id: ID, name: 'مريم', role: 'teacher' };
const STUDENT = { kind: 'student', id: ID, name: 'ليلى', code: 'AB-0001' };

describe('meetingInviteRoutes (R-MEET-01..03)', () => {
  it.each([
    ['inviteeOptions', 'GET /meetings/invitee-options'],
    ['update', 'PATCH /meetings/:id'],
    ['cancel', 'POST /meetings/:id/cancel'],
    ['invitees', 'GET /meetings/:id/invitees'],
    ['add', 'POST /meetings/:id/invitees'],
    ['resend', 'POST /meetings/:id/invitees/:inviteeId/resend'],
  ] as const)('%s keeps the path the api serves today, for meetings.write', (key, wire) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
    expect([route.permissions, route.tags]).toEqual([['meetings.write'], ['classroom']]);
  });

  it('refuses a meeting or invitee id that is not a uuid', () => {
    expect(routes.cancel.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.resend.params.safeParse({ id: ID, inviteeId: 'nope' }).success).toBe(false);
    expect(routes.resend.params.parse({ id: ID, inviteeId: ID })).toEqual({ id: ID, inviteeId: ID });
  });

  it('takes an optional search of at most 60 letters', () => {
    expect(routes.inviteeOptions.query.parse({})).toEqual({});
    expect(routes.inviteeOptions.query.safeParse({ q: 'x'.repeat(61) }).success).toBe(false);
  });

  it('answers staff and students as options and refuses another kind or a phone-only row', () => {
    const options = routes.inviteeOptions.response;
    expect(options.parse([STAFF, STUDENT])).toEqual([STAFF, STUDENT]);
    expect(options.safeParse([{ kind: 'phone', id: ID, name: 'x' }]).success).toBe(false);
    expect(options.safeParse([{ ...STUDENT, code: undefined }]).success).toBe(false);
  });

  it('refuses an empty reschedule, an empty invitee list and a resend without a request id', () => {
    expect(routes.update.body.safeParse({}).success).toBe(false);
    expect(routes.update.body.parse({ title: ' جديد ' })).toEqual({ title: 'جديد' });
    expect(routes.add.body.safeParse({ invitees: [] }).success).toBe(false);
    expect(routes.resend.body.safeParse({}).success).toBe(false);
  });

  it('answers 204 to a reschedule and a cancel', () => {
    expect([routes.update.response, routes.cancel.response]).toEqual(['empty', 'empty']);
  });
});
