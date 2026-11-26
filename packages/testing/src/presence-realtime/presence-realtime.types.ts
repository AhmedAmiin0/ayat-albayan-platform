export interface FakeTopic {
  sync?: () => void;
  status?: (status: string) => void;
  metas: unknown[];
  tracked: unknown[];
  removed: boolean;
}

export interface FakeChannel {
  topic: FakeTopic;
  on: (type: string, filter: unknown, cb: () => void) => FakeChannel;
  subscribe: (cb?: (status: string) => void) => FakeChannel;
  presenceState: () => { key: unknown[] };
  track: (payload: unknown) => Promise<string>;
}

/** The exports of the mocked lib/http/supabase module. */
export interface FakeSupabaseModule {
  supabase: {
    auth: { getSession: () => Promise<{ data: { session: null }; error: null }> };
    realtime: { setAuth: () => Promise<undefined> };
    channel: (name: string) => FakeChannel;
    removeChannel: (ch: { topic: FakeTopic }) => Promise<string>;
  };
}
