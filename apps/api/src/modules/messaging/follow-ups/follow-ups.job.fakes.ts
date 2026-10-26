import { vi } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { fakePolicy, type FakePolicyInput } from '../notification-rules/policy/policy.fakes';
import type { QueuedMessage } from '../reminders/queued-row';
import type { FollowUpSlots } from './follow-up-slots';
import { FollowUpsReads } from './follow-ups.deps';
import { sampleLead } from './follow-ups.fakes';
import { FollowUpsJob } from './follow-ups.job';
import type { FollowUpLeadRow, StageRow } from './follow-ups.plan';
import type { AdvanceInput, FollowUpsQueries } from './follow-ups.queries';
import { FollowUpsSettings } from './follow-ups.settings';

/** Sun 4 Oct 17:00, Sun 17:45, Mon 5 Oct 18:00 Riyadh. */
const FREE = ['2026-10-04T14:00:00Z', '2026-10-04T14:45:00Z', '2026-10-05T15:00:00Z'].map((s) => new Date(s));

export interface JobSetup {
  leads?: FollowUpLeadRow[];
  approved?: boolean;
  free?: Date[];
  /** The row already under the lead's current key. */
  prior?: StageRow | null;
  /** What the insert reports (0 = the dedup key was taken). */
  inserted?: number;
  /** settings.auto_messages_enabled (default here: ON, the behaviour before migration 162). */
  auto?: boolean;
  /** The notification rules (default: legacy mode, no rows, the registry's follow-up settings). */
  rules?: FakePolicyInput;
}

/** FollowUpsJob over in-memory query doubles (test-only). */
export function setup(opts: JobSetup = {}) {
  const queued: QueuedMessage[] = [];
  const advanced: AdvanceInput[] = [];
  const keys: string[] = [];
  const queries = {
    candidates: vi.fn(async () => opts.leads ?? [sampleLead()]),
    approved: vi.fn(async () => opts.approved ?? true),
    stageRow: vi.fn(async (key: string) => {
      keys.push(key);
      return opts.prior ?? null;
    }),
    drop: vi.fn(async () => undefined),
    queue: vi.fn(async (row: QueuedMessage) => {
      queued.push(row);
      return opts.inserted ?? 1;
    }),
    sync: vi.fn(async () => undefined),
    advance: vi.fn(async (a: AdvanceInput) => advanced.push(a) > 0),
  };
  const slots = { freeStarts: vi.fn(async () => opts.free ?? FREE) };
  const settings = readerOf(FollowUpsSettings, { auto_messages_enabled: opts.auto ?? true });
  const job = new FollowUpsJob(
    queries as unknown as FollowUpsQueries,
    slots as unknown as FollowUpSlots,
    new FollowUpsReads(settings, fakePolicy(opts.rules)),
  );
  return { job, queries, slots, queued, advanced, keys };
}
