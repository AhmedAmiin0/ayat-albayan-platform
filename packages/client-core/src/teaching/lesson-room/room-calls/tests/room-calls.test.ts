import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { lessonRoomCalls, studentLinkCalls } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const WINDOW = {
  state: 'open',
  opens_at: '2026-11-27T09:45:00.000Z',
  closes_at: '2026-11-27T12:00:00.000Z',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('lessonRoomCalls (R-LES-01)', () => {
  it('opens the room by the lesson id and answers the window with its stamp', async () => {
    const opened = { ...WINDOW, room_opened_at: WINDOW.opens_at };
    const { client, apiSend } = clientAnswering(opened);
    await expect(lessonRoomCalls(client).openRoom(ID)).resolves.toEqual(opened);
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${ID}/room/open`, undefined);
  });

  it('issues the student link and refuses an answer without a url', async () => {
    const url = { url: 'https://example.test/s/abc' };
    const { client, apiSend } = clientAnswering(url);
    await expect(lessonRoomCalls(client).issueStudentLink(ID)).resolves.toEqual(url);
    expect(apiSend).toHaveBeenCalledWith('POST', `/students/${ID}/join-link`, undefined);
    const bad = clientAnswering({});
    await expect(lessonRoomCalls(bad.client).issueStudentLink(ID)).rejects.toThrow();
  });
});

describe('studentLinkCalls', () => {
  it('reads the page by its token, encoded in the path', async () => {
    const page = { first_name: 'ليلى', lesson: null };
    const { client, apiFetch } = clientAnswering(page);
    await expect(studentLinkCalls(client).view('a/b')).resolves.toEqual(page);
    expect(apiFetch).toHaveBeenCalledWith('/public/student/a%2Fb');
  });

  it('refuses a page whose lesson has an unknown window state', async () => {
    const lesson = { id: ID, starts_at: '', ends_at: '', teacher_name: 'مريم' };
    const page = { first_name: 'ليلى', lesson: { ...lesson, window: { ...WINDOW, state: 'x' } } };
    const { client } = clientAnswering(page);
    await expect(studentLinkCalls(client).view('t')).rejects.toThrow();
  });

  it('joins the open lesson by the token, with the name when one was typed', async () => {
    const join = { url: 'wss://x', token: 't', room: 'r', role: 'guest' };
    const { client, apiSend } = clientAnswering(join);
    await expect(studentLinkCalls(client).join({ token: 'a/b', name: 'سارة' })).resolves.toEqual(
      join,
    );
    expect(apiSend).toHaveBeenCalledWith('POST', '/public/student/a%2Fb/join', { name: 'سارة' });
    await studentLinkCalls(client).join({ token: 't' });
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/public/student/t/join', {});
  });

  it('refuses a join answer without the room credentials', async () => {
    const { client } = clientAnswering({ url: 'wss://x' });
    await expect(studentLinkCalls(client).join({ token: 't' })).rejects.toThrow();
  });
});
