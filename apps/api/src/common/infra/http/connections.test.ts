import { channel } from 'node:diagnostics_channel';
import { describe, expect, it } from 'vitest';
import { CONNECTED_CHANNEL, connectionsOpened } from './connections';

describe('connectionsOpened (docs/42 42-6)', () => {
  it('counts every undici:client:connected event', () => {
    const before = connectionsOpened();
    channel(CONNECTED_CHANNEL).publish({});
    channel(CONNECTED_CHANNEL).publish({});
    expect(connectionsOpened() - before).toBe(2);
  });
});
