import type { MessageView } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { MessageBubble } from '@/features/messaging/inbox/messages/components/MessageBubble';
import { InboxModeContext, type InboxMode } from '@/features/messaging/inbox/shared/mode';

// The bubble with «أرسل عبر واتساب» (WhatsAppSendLine*.test.tsx), and the tab window.open gives.

export const NOW = new Date('2026-11-06T12:00:00Z');
export const held: Partial<MessageView> = {
  id: 'm-held',
  direction: 'outbound',
  status: 'queued',
  error_code: 'awaiting_reply',
  // An Arabic greeting, escaped: a .tsx takes its words from i18n (i18n-literals.test.ts).
  body: '\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645',
  phone_e164: '+966500000001',
};

export function renderBubble(patch: Partial<MessageView>, mode: InboxMode = 'admin'): QueryClient {
  return renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ul>
        <MessageBubble message={message({ ...held, ...patch })} waitingTemplate={false} now={NOW} />
      </ul>
    </InboxModeContext.Provider>,
  );
}

export const button = (name: string) => screen.queryByRole('button', { name });
export const action = () => button(t.messages.whatsappSend.action);

/** A stand-in for the blank tab opened inside the click. */
export function fakeTab() {
  return { opener: {} as unknown, location: { replace: vi.fn() }, close: vi.fn() };
}
