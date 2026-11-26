// A fake Supabase Realtime for the presence tests (docs/33): in an app test wire it with
//   jest.mock('@ab/mobile-kit/lib/http/supabase', () =>
//     jest.requireActual('@ab/testing/presence-realtime').realtime.module());
// then steer it through `realtime`: join the topics, put a person online, read what was tracked.

import type { FakeChannel, FakeSupabaseModule, FakeTopic } from './presence-realtime.types';

const topics = new Map<string, FakeTopic>();

const topicOf = (id: string): FakeTopic | undefined => topics.get(`presence:${id}`);

export const realtime = {
  /** The mocked module's exports (jest.mock factory). */
  module: (): FakeSupabaseModule => fakeSupabase(),
  reset: (): void => topics.clear(),
  /** The topics a client opened (removed ones included), in order. */
  topics: (): string[] => [...topics.keys()],
  isOpen: (id: string): boolean => topicOf(id)?.removed === false,
  /** Every open topic answers its join. */
  joinAll: (): void => {
    for (const topic of topics.values()) if (!topic.removed) topic.status?.('SUBSCRIBED');
  },
  /** The person's topic holds a tracked meta (on) or none (off), and its sync fires. */
  present: (id: string, on = true): void => {
    const topic = topicOf(id);
    if (!topic) return;
    topic.metas = on ? [{ at: 'x' }] : [];
    topic.sync?.();
  },
  tracked: (id: string): unknown[] => topicOf(id)?.tracked ?? [],
};

function channel(name: string): FakeChannel {
  const topic: FakeTopic = { metas: [], tracked: [], removed: false };
  topics.set(name, topic);
  const ch: FakeChannel = {
    topic,
    on: (_type: string, _filter: unknown, cb: () => void) => {
      topic.sync = cb;
      return ch;
    },
    subscribe: (cb?: (status: string) => void) => {
      topic.status = cb;
      return ch;
    },
    presenceState: () => ({ key: topic.metas }),
    track: (payload: unknown) => {
      topic.tracked.push(payload);
      return Promise.resolve('ok');
    },
  };
  return ch;
}

/** The module lib/http/supabase with this fake as its realtime client. */
function fakeSupabase(): FakeSupabaseModule {
  return {
    supabase: {
      auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
      realtime: { setAuth: () => Promise.resolve(undefined) },
      channel,
      removeChannel: (ch: { topic: FakeTopic }) => {
        ch.topic.removed = true;
        return Promise.resolve('ok');
      },
    },
  };
}
