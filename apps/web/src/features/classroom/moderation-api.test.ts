import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lessonIdOfRoom, recordingsQuery, removeParticipant } from './moderation-api';

const api = vi.hoisted(() => ({ fetch: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/api', () => ({ apiFetch: api.fetch, apiSend: api.send }));

describe('moderation api', () => {
  beforeEach(() => {
    api.fetch.mockResolvedValue([]);
    api.send.mockResolvedValue(undefined);
  });

  it('reads the lesson id off the room name, null for anything else', () => {
    expect(lessonIdOfRoom('lesson-42')).toBe('42');
    expect(lessonIdOfRoom('lesson-')).toBeNull();
    expect(lessonIdOfRoom('r')).toBeNull();
  });

  it('removes by identity (url-encoded)', async () => {
    await removeParticipant({ lessonId: 'L1', identity: 'guest:a b' });
    expect(api.send).toHaveBeenCalledWith('POST', '/lessons/L1/room/participants/guest%3Aa%20b/remove');
  });

  it('lists the recordings of a lesson', async () => {
    const q = recordingsQuery('L1');
    expect(q.queryKey).toEqual(['classroom', 'recordings', 'L1']);
    await (q.queryFn as () => Promise<unknown>)();
    expect(api.fetch).toHaveBeenCalledWith('/lessons/L1/recordings');
  });
});
