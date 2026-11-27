import { describe, expect, it, vi } from 'vitest';
import { lessonRoomSends } from './lesson-room';

const LESSON = '00000000-0000-4000-8000-000000000001';
const WHO = 'guest-0123456789ab';
const room = `/lessons/${LESSON}/room/participants`;

const make = (answer: (path: string) => Promise<unknown>) => {
  const apiSend = vi.fn((_m: string, path: string, _body?: unknown) => answer(path));
  return {
    apiSend,
    sends: lessonRoomSends({ apiFetch: vi.fn(), apiSend }),
  };
};

describe('lessonRoomSends (R-CLS)', () => {
  it('«إنهاء الحلقة للجميع» answers the stamp, parsed', async () => {
    const { apiSend, sends } = make(async () => ({ endedAt: '2026-11-16T10:00:00.000Z' }));
    await expect(sends.end(LESSON)).resolves.toEqual({ endedAt: '2026-11-16T10:00:00.000Z' });
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${LESSON}/end`, undefined);
  });

  it('refuses an end answer without the stamp', async () => {
    await expect(make(async () => ({})).sends.end(LESSON)).rejects.toThrow();
  });

  it('mutes one source and removes one person', async () => {
    const { apiSend, sends } = make(async () => undefined);
    await sends.mute({ lessonId: LESSON, identity: WHO, source: 'camera' });
    await sends.remove({ lessonId: LESSON, identity: WHO });
    expect(apiSend.mock.calls).toEqual([
      ['POST', `${room}/${WHO}/mute`, { source: 'camera' }],
      ['POST', `${room}/${WHO}/remove`, undefined],
    ]);
  });

  it('escapes an identity in the path', async () => {
    const { apiSend, sends } = make(async () => undefined);
    await sends.remove({ lessonId: LESSON, identity: 'a b' });
    expect(apiSend).toHaveBeenCalledWith('POST', `${room}/a%20b/remove`, undefined);
  });

  it('«كتم الجميع» mutes every microphone and reports the first refusal', async () => {
    const refusal = new Error('cannot_mute');
    const { apiSend, sends } = make(async (p) =>
      p.includes('guest-2') ? Promise.reject(refusal) : undefined,
    );
    await expect(
      sends.muteAll({ lessonId: LESSON, identities: ['guest-1', 'guest-2'] }),
    ).rejects.toBe(refusal);
    expect(apiSend).toHaveBeenCalledTimes(2);
    await expect(
      sends.muteAll({ lessonId: LESSON, identities: ['guest-1'] }),
    ).resolves.toBeUndefined();
  });
});
