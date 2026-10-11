import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { SenderQueries } from './sender.queries';

// Review A, C1 (docs/12 §13.3): while the chat client is not configured, chat-stamped session
// texts can never send, so due() does not read them (they would fill the 50-row batch forever).

const M = 'messages';
const NOW = new Date('2026-10-02T08:00:00Z');
const CHAT_FILTER = 'template_key.not.is.null,line.is.null,line.neq.chat';
const ors = (calls: { method: string; args: unknown[] }[]) => calls.filter((c) => c.method === 'or').map((c) => c.args[0]);

function chatEnv(): void {
  vi.stubEnv('WA_API_BASE', 'http://localhost:4010');
  vi.stubEnv('WA_PHONE_NUMBER_ID', 'n-phone');
  vi.stubEnv('WA_WABA_ID', 'n-waba');
  vi.stubEnv('WA_ACCESS_TOKEN', 'n-token');
  vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', 'c-phone');
  vi.stubEnv('WA_CHAT_WABA_ID', 'c-waba');
}

describe('SenderQueries.due — chat rows without a chat client', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('chat unconfigured: due() leaves chat-stamped session texts out', async () => {
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    const q = new SenderQueries(db);
    expect(q.chatConfigured).toBe(false);
    await q.due({ keys: ['booking_confirmation'], now: NOW, limit: 50 });
    expect(ors(calls)).toContain(CHAT_FILTER);
  });

  it('chat configured: due() reads chat-stamped texts as before', async () => {
    chatEnv();
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    const q = new SenderQueries(db);
    expect(q.chatConfigured).toBe(true);
    await q.due({ keys: [], now: NOW, limit: 50 });
    expect(ors(calls)).not.toContain(CHAT_FILTER);
    expect(ors(calls)).toHaveLength(3);
  });

  it('the chat config is read at construction', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    const q = new SenderQueries(db);
    chatEnv();
    await q.due({ keys: [], now: NOW, limit: 50 });
    expect(ors(calls)).toContain(CHAT_FILTER);
  });

  it('the chat filter combines with the allow-list', async () => {
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', '+201001234567');
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    await new SenderQueries(db).due({ keys: [], now: NOW, limit: 50 });
    expect(ors(calls)).toContain(CHAT_FILTER);
    expect(calls.filter((c) => c.method === 'in').map((c) => c.args)).toEqual([['phone_e164', ['+201001234567']]]);
  });
});
