import { describe, expect, it, vi } from 'vitest';
import { lessonEndPath, lessonMutePath, lessonRemovePath, lessonRoomSends } from './lesson-room';

const make = (answer: (path: string) => Promise<unknown>) => {
  const apiSend = vi.fn((_m: string, path: string) => answer(path));
  return {
    apiSend,
    sends: lessonRoomSends({ apiFetch: vi.fn(), apiSend }),
  };
};

describe('lesson room paths', () => {
  it('end, mute and remove under /lessons/:id', () => {
    expect(lessonEndPath('l1')).toBe('/lessons/l1/end');
    expect(lessonMutePath('l1', 'guest-0123456789ab')).toBe(
      '/lessons/l1/room/participants/guest-0123456789ab/mute',
    );
    expect(lessonRemovePath('l1', 'a b')).toBe('/lessons/l1/room/participants/a%20b/remove');
  });
});

describe('lessonRoomSends', () => {
  it('«إنهاء الحلقة للجميع» answers the stamp, parsed', async () => {
    const { apiSend, sends } = make(async () => ({ endedAt: '2026-11-16T10:00:00.000Z' }));
    await expect(sends.end('l1')).resolves.toEqual({ endedAt: '2026-11-16T10:00:00.000Z' });
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l1/end');
  });

  it('refuses an end answer without the stamp', async () => {
    await expect(make(async () => ({})).sends.end('l1')).rejects.toThrow();
  });

  it('mutes one source and removes one person', async () => {
    const { apiSend, sends } = make(async () => undefined);
    await sends.mute({ lessonId: 'l1', identity: 'guest-1', source: 'camera' });
    await sends.remove({ lessonId: 'l1', identity: 'guest-1' });
    expect(apiSend).toHaveBeenNthCalledWith(
      1,
      'POST',
      '/lessons/l1/room/participants/guest-1/mute',
      { source: 'camera' },
    );
    expect(apiSend).toHaveBeenNthCalledWith(
      2,
      'POST',
      '/lessons/l1/room/participants/guest-1/remove',
    );
  });

  it('«كتم الجميع» mutes every microphone and reports the first refusal', async () => {
    const refusal = new Error('cannot_mute');
    const { apiSend, sends } = make(async (p) =>
      p.includes('guest-2') ? Promise.reject(refusal) : undefined,
    );
    await expect(
      sends.muteAll({ lessonId: 'l1', identities: ['guest-1', 'guest-2'] }),
    ).rejects.toBe(refusal);
    expect(apiSend).toHaveBeenCalledTimes(2);
    await expect(
      sends.muteAll({ lessonId: 'l1', identities: ['guest-1'] }),
    ).resolves.toBeUndefined();
  });
});
