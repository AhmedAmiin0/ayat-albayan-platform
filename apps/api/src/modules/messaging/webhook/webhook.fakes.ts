// Test fakes for the webhook services (not shipped behaviour).
import type { TablesInsert } from '@ab/db';
import { vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import type { PushService } from '../../../common/push/push.service';
import { lead } from '../../sales/leads/leads.fakes';
import type { LeadsService } from '../../sales/leads/leads.service';
import type { RatingStore } from '../../teaching/lesson-rating/rating.store';
import type { LessonStatusService } from '../../teaching/lessons/status/lesson-status.service';
import type { InboundEvent } from './webhook.events';
import { InboundService } from './inbound/webhook.inbound.service';
import { InboundStore } from './inbound/webhook.inbound.store';
import type { Contact, OutboundRow, WebhookQueries } from './webhook.queries';
import { QuickReplies } from './inbound/webhook.quick-reply';
import { StatusService } from './status/webhook.status.service';

export const LESSON_ID = '00000000-0000-4000-8000-0000000000a1';
export const GUARDIAN_ID = '00000000-0000-4000-8000-0000000000b1';
export const NEW_LEAD_ID = '00000000-0000-4000-8000-0000000000c1';
export const AT = new Date('2026-10-03T13:00:00Z');

export const nobody = (): Contact => ({ guardian: null, teacher: null, lead: null });

export function event(over: Partial<InboundEvent> = {}): InboundEvent {
  return {
    waMessageId: 'wamid.IN1',
    from: '966501234567',
    name: 'أم سهيلة',
    at: AT,
    type: 'text',
    body: 'السلام عليكم',
    replyKey: null,
    replyTo: null,
    mediaId: null,
    mediaMime: null,
    payload: null,
    line: null,
    ...over,
  };
}

export function outbound(over: Partial<OutboundRow> = {}): OutboundRow {
  return {
    id: 'msg-out-1',
    status: 'sent',
    phone_e164: '+966501234567',
    lesson_id: null,
    template_key: 'lesson_reminder',
    body: null,
    sent_at: '2026-10-03T12:00:00.000Z',
    delivered_at: null,
    read_at: null,
    guardians: { name: 'أم سهيلة' },
    leads: null,
    ...over,
  };
}

/** WebhookQueries with an in-memory wamid set, so replays behave like the unique index. */
export function fakeQueries() {
  const stored: TablesInsert<'messages'>[] = [];
  return {
    stored,
    identify: vi.fn().mockResolvedValue(nobody()),
    latestInSecond: vi.fn(async (phone: string, at: Date) => {
      const from = Math.floor(at.getTime() / 1000) * 1000;
      const times = stored
        .filter((r) => r.phone_e164 === phone && r.created_at)
        .map((r) => Date.parse(r.created_at ?? ''))
        .filter((t) => t >= from && t < from + 1000);
      return times.length ? new Date(Math.max(...times)) : null;
    }),
    insertInbound: vi.fn(async (row: TablesInsert<'messages'>) => {
      if (stored.some((r) => r.wa_message_id === row.wa_message_id)) return false;
      stored.push(row);
      return true;
    }),
    deleteInbound: vi.fn(async (waMessageId: string) => {
      const i = stored.findIndex((r) => r.wa_message_id === waMessageId);
      if (i >= 0) stored.splice(i, 1);
    }),
    outboundByWaId: vi.fn().mockResolvedValue(null),
    moveStatus: vi.fn().mockResolvedValue(true),
    guardianLesson: vi.fn().mockResolvedValue(true),
    recentLessonOutbound: vi.fn().mockResolvedValue(null),
    replyWindowMs: vi.fn().mockResolvedValue(48 * 3_600_000),
    updateLead: vi.fn().mockResolvedValue(undefined),
    guardianOwners: vi.fn().mockResolvedValue([] as string[]),
  };
}

export function fakeDeps() {
  return {
    queries: fakeQueries(),
    leads: { upsertByPhone: vi.fn().mockResolvedValue(lead({ id: NEW_LEAD_ID })) },
    lessons: { confirm: vi.fn().mockResolvedValue(LESSON_ID) },
    push: { notifyAdmins: vi.fn().mockResolvedValue(undefined), notifySales: vi.fn().mockResolvedValue(undefined) },
    audit: { record: vi.fn().mockResolvedValue(undefined) },
    ratings: { record: vi.fn().mockResolvedValue(1) },
  };
}
export type Deps = ReturnType<typeof fakeDeps>;

/** The real services over the fakes. */
export function services(d: Deps = fakeDeps()) {
  const queries = d.queries as unknown as WebhookQueries;
  const push = d.push as unknown as PushService;
  const replies = new QuickReplies(
    queries,
    d.lessons as unknown as LessonStatusService,
    d.audit as unknown as AuditService,
  );
  const store = new InboundStore(queries, d.leads as unknown as LeadsService, d.ratings as unknown as RatingStore);
  const inbound = new InboundService(store, replies, push);
  const statuses = new StatusService(queries, push);
  return { ...d, replies, inbound, statuses };
}
