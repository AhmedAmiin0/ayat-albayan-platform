import { vi } from 'vitest';
import type { TemplateView } from '@ab/shared';
import type { MessageDispatch } from '@/modules/messaging/whatsapp/sender/message.dispatch';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { toTemplateView } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import type { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { ReopenRow } from './reopen-state';
import { ReopenRequest } from './reopen-request';
import { WindowHold } from './window-hold';
import { WindowRelease } from './window-release';
import type { WindowRepo } from './window.repo';
import type { WindowSettings } from './window.settings';

// Test-only: WindowHold over fakes (never a database, never Kapso or Meta).

export const NOW = new Date('2026-11-03T08:00:00Z');
export const PHONE = '+966500000001';
export const STAFF = 's0000000-0000-4000-8000-000000000001';

/** A staff text the inbox queued after the window (AWAITING_REPLY, no deadline yet). */
export function staffText(over: Partial<DueMessage> = {}): DueMessage {
  return dueMessage({
    phone_e164: PHONE,
    template_key: null,
    template_params: null,
    lesson_id: null,
    body: 'السلام عليكم',
    dedup_key: `admin:${PHONE}:r1`,
    created_by: STAFF,
    sent_by_teacher_id: null,
    created_at: '2026-11-03T07:59:00Z',
    error_code: 'awaiting_reply',
    line: 'chat',
    ...over,
  });
}

const STARTER = {
  key: 'welcome_greeting',
  line: 'chat' as const,
  sales_starter: true,
  params: [],
  buttons: [],
};
const WELCOME = toTemplateView(templateRow(STARTER));

export function windowFakes() {
  const repo = {
    reopens: vi.fn(async (): Promise<ReopenRow[]> => []),
    queueReopen: vi.fn(async () => undefined),
    hold: vi.fn(async () => true),
    fail: vi.fn(async () => undefined),
    waiting: vi.fn(async () => []),
    lastChatInbound: vi.fn(async () => new Map<string, string>()),
    release: vi.fn(async (ids: readonly string[]) => ids.length),
  };
  const approved = vi.fn(async (key: string): Promise<TemplateView | null> =>
    key === WELCOME.key ? WELCOME : null,
  );
  const settings = { read: vi.fn(async () => ({ chat_reopen_template: 'welcome_greeting' })) };
  const dispatch = { ready: vi.fn(() => true) };
  const asRepo = repo as unknown as WindowRepo;
  const request = new ReopenRequest(
    asRepo,
    { approved } as unknown as TemplateRegistry,
    settings as unknown as WindowSettings,
  );
  const release = new WindowRelease(asRepo);
  const hold = new WindowHold(
    asRepo,
    request,
    release,
    dispatch as unknown as MessageDispatch,
  );
  return { repo, approved, settings, dispatch, hold, request, release };
}

/** A reopen template row of PHONE (today, 2026-11-03 in Riyadh), as WindowRepo.reopens reads it. */
export function reopenOf(over: Partial<ReopenRow> = {}): ReopenRow {
  return {
    phone_e164: PHONE,
    status: 'sent',
    error_code: null,
    expires_at: '2026-11-04T07:00:00Z',
    created_at: '2026-11-03T07:00:00Z',
    dedup_key: `reopen:${PHONE}:2026-11-03`,
    ...over,
  };
}
