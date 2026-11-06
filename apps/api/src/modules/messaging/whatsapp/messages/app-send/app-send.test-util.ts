import { vi } from 'vitest';
import type { MessageViews } from '@/modules/messaging/whatsapp/messages/message.views';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { AppSendAdopt } from '@/modules/messaging/whatsapp/sender/window/manual-send';
import type { AppSendRepo } from './app-send.repo';
import { AppSend } from './app-send.service';

// Test-only: AppSend over fakes (never a database).

export const ID = 'b0000000-0000-4000-8000-000000000009';
export const NOW = new Date('2026-11-06T10:00:00Z');

/** A staff text held after the window, on the chat line. */
export const staffText = (over = {}) =>
  messageRow({
    id: ID,
    status: 'queued',
    error_code: 'awaiting_reply',
    created_by: 'u0000000-0000-4000-8000-000000000001',
    template_key: null,
    template_params: null,
    body: 'السلام عليكم',
    line: 'chat',
    ...over,
  });

export function setup(row: ReturnType<typeof messageRow>) {
  const repo = {
    get: vi.fn().mockResolvedValue(row),
    start: vi.fn((w: { until: Date }) =>
      Promise.resolve({ ...row, app_send_until: w.until.toISOString() }),
    ),
  };
  const views = { view: vi.fn((r: unknown) => Promise.resolve(r)) };
  const adopts = { adopt: vi.fn(() => Promise.resolve(false)) };
  const svc = new AppSend(
    repo as unknown as AppSendRepo,
    views as unknown as MessageViews,
    adopts as unknown as AppSendAdopt,
  );
  return { svc, repo, adopts };
}
