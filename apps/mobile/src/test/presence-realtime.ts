// A fake Supabase Realtime for the presence tests (docs/33): wire it with
//   jest.mock('@/core/lib/http/supabase', () =>
//     jest.requireActual('@/test/presence-realtime').realtime.module());
// then steer it through `realtime`: join the topics, put a person online, read what was tracked.

interface FakeTopic {
  sync?: () => void;
  status?: (status: string) => void;
  metas: unknown[];
  tracked: unknown[];
  removed: boolean;
}

const topics = new Map<string, FakeTopic>();

const topicOf = (id: string): FakeTopic | undefined => topics.get(`presence:${id}`);

export const realtime = {
  /** The mocked module's exports (jest.mock factory). */
  module: () => fakeSupabase(),
  reset: () => topics.clear(),
  /** The topics a client opened (removed ones included), in order. */
  topics: (): string[] => [...topics.keys()],
  isOpen: (id: string): boolean => topicOf(id)?.removed === false,
  /** Every open topic answers its join. */
  joinAll: () => {
    for (const topic of topics.values()) if (!topic.removed) topic.status?.('SUBSCRIBED');
  },
  /** The person's topic holds a tracked meta (on) or none (off), and its sync fires. */
  present: (id: string, on = true) => {
    const topic = topicOf(id);
    if (!topic) return;
    topic.metas = on ? [{ at: 'x' }] : [];
    topic.sync?.();
  },
  tracked: (id: string): unknown[] => topicOf(id)?.tracked ?? [],
};

function channel(name: string) {
  const topic: FakeTopic = { metas: [], tracked: [], removed: false };
  topics.set(name, topic);
  const ch = {
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
    track: async (payload: unknown) => {
      topic.tracked.push(payload);
      return 'ok';
    },
  };
  return ch;
}

/** The module '@/core/lib/http/supabase' with this fake as its realtime client. */
function fakeSupabase() {
  return {
    supabase: {
      auth: { getSession: async () => ({ data: { session: null }, error: null }) },
      realtime: { setAuth: async () => undefined },
      channel,
      removeChannel: async (ch: { topic: FakeTopic }) => {
        ch.topic.removed = true;
        return 'ok';
      },
    },
  };
}
