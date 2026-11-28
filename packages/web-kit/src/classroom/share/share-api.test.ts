import { afterEach, describe, expect, it, vi } from 'vitest';
import { grantShareFor } from './share-api';

const call = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@ab/web-kit/lib/http/api/api', () => ({ call }));

describe('grantShareFor', () => {
  afterEach(() => call.mockClear());

  it('posts {allow} to the lesson or the meeting route; null for any other room', async () => {
    await grantShareFor('lesson-L1')?.({ identity: 'guest-1', allow: true });
    expect(call).toHaveBeenLastCalledWith({
      method: 'POST',
      path: '/lessons/L1/room/participants/guest-1/share',
      body: { allow: true },
    });
    await grantShareFor('meeting-M1')?.({ identity: 'guest-1', allow: false });
    expect(call).toHaveBeenLastCalledWith({
      method: 'POST',
      path: '/meetings/M1/participants/guest-1/share',
      body: { allow: false },
    });
    expect(grantShareFor('other')).toBeNull();
  });
});
