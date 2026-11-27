import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { lessonMoveCalls } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const AT = '2026-10-06T15:30:00.000Z';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('lessonMoveCalls (R-SCH-07, R-SCH-11)', () => {
  it('reschedules one lesson with the new start as the body', async () => {
    const { client, apiSend } = clientAnswering(null);
    const body = { scope: 'one' as const, startsAt: AT };
    await expect(lessonMoveCalls(client).reschedule({ id: ID }, body)).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${ID}/reschedule`, body);
  });

  it('edits the time in place with PATCH', async () => {
    const { client, apiSend } = clientAnswering(null);
    const body = { expectedStartsAt: AT, startsAt: AT, durationMin: 45 as const };
    await expect(lessonMoveCalls(client).editTime({ id: ID }, body)).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/lessons/${ID}/time`, body);
  });

  it('refuses an edit answer whose payout state it does not know', async () => {
    const answer = { lesson: {}, notified: 0, payout: 'paid', pdf_refresh: false };
    const { client } = clientAnswering(answer);
    const body = { expectedStartsAt: AT, startsAt: AT, durationMin: 45 as const };
    await expect(lessonMoveCalls(client).editTime({ id: ID }, body)).rejects.toThrow();
  });

});
