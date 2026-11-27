import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { lessonJoinCalls } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const STUDENT = '00000000-0000-4000-8000-000000000002';
const EXPIRES = '2026-11-27T12:00:00.000Z';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('lessonJoinCalls (R-LES-01)', () => {
  it('joins the lesson room and refuses an answer with an unknown role', async () => {
    const join = { url: 'wss://x', token: 't', room: 'r', role: 'admin' };
    const { client, apiSend } = clientAnswering(join);
    await expect(lessonJoinCalls(client).join(ID)).resolves.toEqual(join);
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${ID}/room/join`, undefined);
    const bad = clientAnswering({ ...join, role: 'boss' });
    await expect(lessonJoinCalls(bad.client).join(ID)).rejects.toThrow();
  });

  it('sends the family link to one student of the lesson', async () => {
    const sent = { expires_at: EXPIRES, replayed: true, message_status: 'queued' };
    const { client, apiSend } = clientAnswering(sent);
    const calls = lessonJoinCalls(client);
    await expect(calls.sendLink({ lessonId: ID, studentId: STUDENT })).resolves.toEqual(sent);
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${ID}/join-link`, {
      studentId: STUDENT,
    });
  });

  it('copies the link url and refuses an answer without its expiry', async () => {
    const link = { url: 'https://example.test/join/abc', expires_at: EXPIRES };
    const { client, apiSend } = clientAnswering(link);
    await expect(lessonJoinCalls(client).linkUrl(ID)).resolves.toEqual(link);
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${ID}/join-link/url`, undefined);
    const bad = clientAnswering({ url: link.url });
    await expect(lessonJoinCalls(bad.client).linkUrl(ID)).rejects.toThrow();
  });

  it('finds the lesson behind a family link, the token encoded in the path', async () => {
    const { client, apiFetch } = clientAnswering({ lessonId: ID });
    await expect(lessonJoinCalls(client).staffLessonOf('a/b')).resolves.toEqual({ lessonId: ID });
    expect(apiFetch).toHaveBeenCalledWith('/join-links/a%2Fb/lesson');
  });
});
