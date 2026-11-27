import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, type Who } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const BAD: [string, Who][] = [
  ['/teachers/me/channels/x/presence', 'teacher'],
  ['/portal/students/x/channel/presence', 'guardian'],
  ['/students/x/channel/presence', 'admin'],
  ['/sales/students/x/channel/presence', 'sales'],
];

describe('channel presence served from its route objects (docs/33 §2)', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('a malformed student id answers validation_failed and reads nobody', async () => {
    const seen = [];
    for (const [path, who] of BAD) {
      const res = await t.call('GET', path, who);
      seen.push([res.statusCode, res.json<{ message: string }>().message]);
    }
    expect(seen).toEqual(Array(4).fill([400, 'validation_failed']));
    expect(t.presence.repo.lastSeen).not.toHaveBeenCalled();
  });
});
