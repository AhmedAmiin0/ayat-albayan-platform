import { afterEach, describe, expect, it, vi } from 'vitest';
import { grantShareFor } from './share-api';

const apiSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/http/api', () => ({ apiSend }));

describe('grantShareFor', () => {
  afterEach(() => apiSend.mockClear());

  it('posts {allow} to the lesson or the meeting route; null for any other room', async () => {
    await grantShareFor('lesson-L1')?.({ identity: 'guest-1', allow: true });
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/lessons/L1/room/participants/guest-1/share', { allow: true });
    await grantShareFor('meeting-M1')?.({ identity: 'guest-1', allow: false });
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/meetings/M1/participants/guest-1/share', { allow: false });
    expect(grantShareFor('other')).toBeNull();
  });
});
