import { describe, expect, it } from 'vitest';
import { meetingRoomRoutes as routes } from '..';

const ID = '0b9f4a3e-7c1d-4e2a-9b6f-1d2c3e4f5a6b';
const TOKEN = 'a'.repeat(43);
const join = { url: 'wss://rooms.example', token: 't', room: `meeting-${ID}`, role: 'guest' };
const view = {
  id: ID,
  title: 'اجتماع',
  created_by: null,
  created_at: '2026-11-16T17:00:00.000Z',
  ends_at: null,
  starts_at: null,
  planned_end_at: null,
  cancelled_at: null,
  state: 'open',
  window: null,
  can_join: true,
  invitees_count: 0,
  my_invite: null,
  can_manage: true,
};

describe('meetingRoomRoutes (R-MEET-01/02)', () => {
  it.each([
    ['create', 'POST /meetings'],
    ['list', 'GET /meetings'],
    ['byLink', 'GET /meetings/by-link/:token'],
    ['end', 'POST /meetings/:id/end'],
    ['newLink', 'POST /meetings/:id/link'],
    ['join', 'POST /meetings/:id/join'],
    ['remove', 'POST /meetings/:id/participants/:identity/remove'],
    ['publicView', 'GET /public/meetings/:token'],
    ['guestJoin', 'POST /public/meetings/:token/join'],
  ] as const)('%s keeps the path the api serves today', (key, wire) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
  });

  it('takes a meeting id as a uuid and any token text, the api answers link_invalid', () => {
    expect(routes.end.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.join.params.parse({ id: ID })).toEqual({ id: ID });
    expect(routes.publicView.params.parse({ token: 'x' })).toEqual({ token: 'x' });
    expect(routes.remove.params.parse({ id: ID, identity: 'x' })).toEqual({ id: ID, identity: 'x' });
  });

  it('creates an instant meeting from an empty or missing body', () => {
    expect(routes.create.body.parse({})).toEqual({});
    expect(routes.create.body.parse(undefined)).toEqual({});
    expect(routes.create.body.safeParse({ durationMin: 5 }).success).toBe(false);
  });

  it('asks a guest for a name of 1 to 30 letters', () => {
    expect(routes.guestJoin.body.parse({ name: ' ضيف ' })).toEqual({ name: 'ضيف' });
    expect(routes.guestJoin.body.safeParse({ name: '' }).success).toBe(false);
    expect(routes.guestJoin.body.safeParse({ name: 'x'.repeat(31) }).success).toBe(false);
  });

  it('answers a room token for a known role only', () => {
    expect(routes.join.response.parse(join)).toEqual(join);
    const withFlags = { ...join, recording: 'off', chat: false };
    expect(routes.guestJoin.response.parse(withFlags)).toEqual(withFlags);
    expect(routes.join.response.safeParse({ ...join, role: 'owner' }).success).toBe(false);
    expect(routes.join.response.safeParse({ ...join, recording: 'maybe' }).success).toBe(false);
  });

  it('lists meetings with their window and the caller\'s own invitation', () => {
    expect(routes.list.response.parse([view])).toEqual([view]);
    const window = { state: 'early', opens_at: view.created_at, closes_at: view.created_at };
    const invited = { ...view, window, my_invite: { status: 'sent', channel: 'in_app' } };
    expect(routes.list.response.parse([invited])).toEqual([invited]);
    expect(routes.list.response.safeParse([{ ...view, state: 'live' }]).success).toBe(false);
    const lost = { ...invited, my_invite: { status: 'lost', channel: 'in_app' } };
    expect(routes.list.response.safeParse([lost]).success).toBe(false);
  });

  it('answers the link once, with one result per invitee', () => {
    const invitee = {
      id: 'i1',
      kind: 'phone',
      display_name: 'ولي الأمر',
      channel: 'link',
      status: 'window_closed',
      error_code: null,
      sent_at: null,
      link: `https://app.example/m/${TOKEN}`,
      invitation_text: 'نص',
    };
    const created = { id: ID, url: `https://app.example/m/${TOKEN}`, invitees: [invitee], replayed: false };
    expect(routes.create.response.parse(created)).toEqual(created);
    const fresh = { id: ID, url: created.url };
    expect(routes.newLink.response.parse(fresh)).toEqual(fresh);
    expect(routes.byLink.response.parse({ id: ID })).toEqual({ id: ID });
    const unknownKind = { ...created, invitees: [{ ...invitee, kind: 'fax' }] };
    expect(routes.create.response.safeParse(unknownKind).success).toBe(false);
  });

  it('shows the guest page its title, state and opening time', () => {
    const page = { title: 'اجتماع', state: 'ended', starts_at: null, opens_at: null };
    expect(routes.publicView.response.parse(page)).toEqual(page);
    expect(routes.publicView.response.safeParse({ ...page, state: 'gone' }).success).toBe(false);
  });
});
