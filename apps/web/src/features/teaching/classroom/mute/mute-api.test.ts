import { afterEach, describe, expect, it, vi } from 'vitest';
import { muteFor } from './mute-api';

const apiSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/http/api', () => ({ apiSend }));

describe('muteFor', () => {
  afterEach(() => apiSend.mockClear());

  it('posts {source} to the lesson or the meeting route; null for any other room', async () => {
    await muteFor('lesson-L1')?.({ identity: 'guest-1', source: 'microphone' });
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/lessons/L1/room/participants/guest-1/mute', { source: 'microphone' });
    await muteFor('meeting-M1')?.({ identity: 'guest-1', source: 'camera' });
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/meetings/M1/participants/guest-1/mute', { source: 'camera' });
    expect(muteFor('other')).toBeNull();
  });
});
