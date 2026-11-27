import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { meetingCalls, publicMeetingCalls } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const TOKEN = 'a/b';
const join = { url: 'wss://rooms.example', token: 't', room: `meeting-${ID}`, role: 'admin' };
const created = { id: ID, url: 'https://app.example/m/x' };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('meetingCalls (R-MEET-01/02)', () => {
  it('creates a meeting with its body and reads the created link', async () => {
    const { client, apiSend } = clientAnswering({ ...created, invitees: [], replayed: false });
    const r = await meetingCalls(client).create({ title: 'تنسيق' });
    expect(r.replayed).toBe(false);
    expect(apiSend).toHaveBeenCalledWith('POST', '/meetings', { title: 'تنسيق' });
  });

  it('lists the meetings and refuses a row in an unknown state', async () => {
    const { client, apiFetch } = clientAnswering([{ id: ID, state: 'live' }]);
    await expect(meetingCalls(client).list()).rejects.toThrow();
    expect(apiFetch).toHaveBeenCalledWith('/meetings');
  });

  it('ends, renews the link and joins by the meeting id', async () => {
    const ended = clientAnswering(undefined);
    await meetingCalls(ended.client).end(ID);
    const link = clientAnswering(created);
    await expect(meetingCalls(link.client).newLink(ID)).resolves.toEqual(created);
    const joined = clientAnswering(join);
    await expect(meetingCalls(joined.client).join(ID)).resolves.toEqual(join);
    expect([ended.apiSend.mock.calls, link.apiSend.mock.calls, joined.apiSend.mock.calls]).toEqual([
      [['POST', `/meetings/${ID}/end`, undefined]],
      [['POST', `/meetings/${ID}/link`, undefined]],
      [['POST', `/meetings/${ID}/join`, undefined]],
    ]);
  });

  it('finds the meeting behind a link and removes someone, both escaped', async () => {
    const { client, apiFetch, apiSend } = clientAnswering({ id: ID });
    await expect(meetingCalls(client).byLink(TOKEN)).resolves.toEqual({ id: ID });
    await meetingCalls(clientAnswering(undefined).client).remove({ meetingId: ID, identity: 'x' });
    expect(apiFetch).toHaveBeenCalledWith('/meetings/by-link/a%2Fb');
    const removed = clientAnswering(undefined);
    await meetingCalls(removed.client).remove({ meetingId: ID, identity: 'guest-0123456789ab' });
    const path = `/meetings/${ID}/participants/guest-0123456789ab/remove`;
    expect(removed.apiSend).toHaveBeenCalledWith('POST', path, undefined);
    expect(apiSend).not.toHaveBeenCalled();
  });
});

describe('publicMeetingCalls', () => {
  it('reads the guest page and joins as a guest by the link token', async () => {
    const page = { title: 'اجتماع', state: 'open', starts_at: null, opens_at: null };
    const viewed = clientAnswering(page);
    await expect(publicMeetingCalls(viewed.client).view(TOKEN)).resolves.toEqual(page);
    expect(viewed.apiFetch).toHaveBeenCalledWith('/public/meetings/a%2Fb');
    const guest = clientAnswering({ ...join, role: 'guest' });
    await publicMeetingCalls(guest.client).join({ linkToken: TOKEN, name: 'ضيف' });
    expect(guest.apiSend).toHaveBeenCalledWith('POST', '/public/meetings/a%2Fb/join', { name: 'ضيف' });
  });

  it('refuses a join answer with an unknown role', async () => {
    const { client } = clientAnswering({ ...join, role: 'owner' });
    await expect(publicMeetingCalls(client).join({ linkToken: TOKEN, name: 'ضيف' })).rejects.toThrow();
  });
});
