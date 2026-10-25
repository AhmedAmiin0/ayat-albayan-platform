import { beforeEach, describe, expect, it, vi } from 'vitest';
import { kickScope, lessonIdOfRoom, meetingIdOfRoom, recordingSourceOf, recordingsQuery, removeParticipant } from './moderation-api';

const api = vi.hoisted(() => ({ fetch: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/http/api', () => ({ apiFetch: api.fetch, apiSend: api.send }));

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

  it('an internal meeting room: its id, and «إخراج» through the meeting route', async () => {
    expect(meetingIdOfRoom('meeting-7')).toBe('7');
    expect(meetingIdOfRoom('lesson-7')).toBeNull();
    expect(kickScope('lesson-9').lessonId).toBe('9');
    expect(kickScope('other').lessonId).toBeNull();
    const scope = kickScope('meeting-7');
    expect(scope.lessonId).toBe('7');
    expect(kickScope('lesson-9').remove).toBeUndefined();
    await scope.remove?.({ lessonId: '7', identity: 'guest-0123456789ab' });
    expect(api.send).toHaveBeenCalledWith('POST', '/meetings/7/participants/guest-0123456789ab/remove');
  });

  it('lists the recordings of a lesson or of a meeting', async () => {
    const q = recordingsQuery({ kind: 'lesson', id: 'L1' });
    expect(q.queryKey).toEqual(['classroom', 'recordings', 'lesson', 'L1']);
    await (q.queryFn as () => Promise<unknown>)();
    expect(api.fetch).toHaveBeenCalledWith('/lessons/L1/recordings');
    await (recordingsQuery({ kind: 'meeting', id: 'M1' }).queryFn as () => Promise<unknown>)();
    expect(api.fetch).toHaveBeenCalledWith('/meetings/M1/recordings');
  });

  it('reads the recording source off the room name', () => {
    expect(recordingSourceOf('lesson-L1')).toEqual({ kind: 'lesson', id: 'L1' });
    expect(recordingSourceOf('meeting-M1')).toEqual({ kind: 'meeting', id: 'M1' });
    expect(recordingSourceOf('other')).toBeNull();
  });
});
