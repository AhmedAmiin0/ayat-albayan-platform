// Test-only fakes for the dedicated calls number (docs/28 §10; excluded from the build): an
// in-memory CallsNumberRepo (answers, the calls number's window, the request rows' outcome).
import { vi } from 'vitest';
import type { CallPermissionReply } from '@ab/shared';
import type { CallsNumberRepo, PermissionReplyInput } from './store/calls-number.repo';

export const CALLS_LINE_ENV = {
  provider: 'kapso' as const,
  base: 'http://stub.test/kapso',
  version: 'v24.0',
  phoneNumberId: 'calls-pn',
  wabaId: 'w1',
  apiKey: 'k',
};

export function fakeNumberStore(input: { lastInbound?: string | null } = {}) {
  const replies = new Map<string, CallPermissionReply>();
  const store = {
    replies,
    lastInbound: vi.fn(async () => input.lastInbound ?? null),
    reply: vi.fn(async (pn: string, phone: string) => replies.get(`${pn}|${phone}`) ?? null),
    saveReply: vi.fn(async (r: PermissionReplyInput) => {
      const key = `${r.phoneNumberId}|${r.phone}`;
      const at = r.at.toISOString();
      if ((replies.get(key)?.at ?? '') > at) return;
      replies.set(key, {
        response: r.response,
        at,
        expires_at: r.expiresAt?.toISOString() ?? null,
      });
    }),
    sent: vi.fn(async (id: string, wamid: string) => ({
      id,
      status: 'sent',
      wa_message_id: wamid,
    })),
    failed: vi.fn(async (id: string, code: string) => ({ id, status: 'failed', error_code: code })),
    view: vi.fn(async (row: { id: string; status?: string }) => ({
      id: row.id,
      status: row.status ?? 'queued',
    })),
  };
  return store as typeof store & CallsNumberRepo;
}
