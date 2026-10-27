// Test fixtures for message reactions (test-only, excluded from the build by the *.fakes.ts pattern).
import type { TablesInsert } from '@ab/db';
import { vi } from 'vitest';
import type { MessageViews } from '../../whatsapp/messages/message.views';
import { toMessageView, type ThreadMessageRow } from '../../whatsapp/messages/message.mapper';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '../inbox.fakes';
import type { Outbox } from '../send/outbox';
import type { ThreadsQueries } from '../threads/threads.queries';
import type { ReactionQueries, ReactionTarget } from './reaction.queries';
import { ThreadReactionService, type ReactionRequest } from './thread-reaction.service';

export const TARGET_ID = '7a1c5b8e-6a52-4c3e-9a3a-1d2b3c4d5e6f';
export const REQ = 'c0000000-0000-4000-8000-000000000009';
export const NOW = new Date('2026-10-27T12:00:00Z');

export const target = (over: Partial<ReactionTarget> = {}): ReactionTarget => ({
  id: TARGET_ID,
  wa_message_id: 'wamid.T',
  created_at: '2026-10-27T10:00:00Z',
  line: null,
  number_id: null,
  interactive_payload: null,
  template_key: null,
  our_reaction: null,
  our_reaction_by: null,
  our_reaction_at: null,
  ...over,
});

export const request = (over: Partial<ReactionRequest> = {}): ReactionRequest => ({
  phone: PHONE,
  messageId: TARGET_ID,
  input: { emoji: '👍', clientRequestId: REQ },
  actorId: 'a1',
  ...over,
});

/**
 * The service over in-memory fakes: one target row, an outbox that keeps ONE row per dedup_key (as the
 * unique index does) and answers `status` for a new row (a failed send also runs the revert, as the trigger).
 */
export function reactionHarness(t: ReactionTarget | null = target(), status: 'sent' | 'failed' = 'sent') {
  const row: ThreadMessageRow = messageRow({ id: TARGET_ID, direction: 'inbound', wa_message_id: 'wamid.T', template_key: null, body: 'السلام عليكم' });
  const jobs = new Map<string, TablesInsert<'messages'>>();
  const reactions = {
    target: vi.fn(async () => t),
    queued: vi.fn(async (key: string) => jobs.has(key)),
    setOurs: vi.fn(async (input: { ours: { emoji: string | null } }) => void (row.our_reaction = input.ours.emoji)),
    supersede: vi.fn(async () => undefined),
  };
  const threads = {
    thread: vi.fn(async () => threadRow({ last_inbound_at: '2026-10-27T11:00:00Z', last_notifications_inbound_at: '2026-10-27T11:00:00Z' })),
    numberWindows: vi.fn(async () => []),
    get: vi.fn(async () => row),
  };
  const outbox = {
    send: vi.fn(async (job: TablesInsert<'messages'>) => {
      const replayed = jobs.has(job.dedup_key ?? '');
      if (!replayed) jobs.set(job.dedup_key ?? '', job);
      if (!replayed && status === 'failed') row.our_reaction = t?.our_reaction ?? null;
      const failed = status === 'failed';
      const view = toMessageView({ row: messageRow({ id: 'r1', status, error_code: failed ? '131047' : null, template_key: null }), template: null });
      return { view, replayed };
    }),
  };
  const service = new ThreadReactionService(reactions as unknown as ReactionQueries, threads as unknown as ThreadsQueries, outbox as unknown as Outbox);
  const views = { view: async (r: ThreadMessageRow) => toMessageView({ row: r, template: null }) };
  Object.assign(service, { views: views as unknown as MessageViews });
  return { service, reactions, threads, outbox, jobs, row };
}
