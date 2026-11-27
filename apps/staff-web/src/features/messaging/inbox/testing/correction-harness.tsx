import type { MessageView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { t } from '@ab/web-kit';
import { MessageLog } from '@/features/messaging/inbox/messages/components/MessageLog';
import { TextComposer } from '@/features/messaging/inbox/composer/components/TextComposer';
import { renderAs, SALES, type Who } from '@/features/messaging/inbox/messages/hide/hide.testing';
import { message, PHONE } from './inbox-fixture';
import { uid } from '@/features/messaging/inbox/testing/sent-fixture';

/** The signed-in staff member's id (renderAs). */
export const ME = 'p1';

/** Her own sent text (two lines), WhatsApp knows it. */
export const OWN = message({
  id: uid('own'),
  direction: 'outbound',
  status: 'sent',
  body: 'The lesson is at five\nSee you then',
  replyable: true,
  forwardable: true,
  sent_by_id: ME,
  created_at: '2026-10-01T09:00:00Z',
});

const log = { phone: PHONE, hasMore: false, loadingOlder: false, onOlder: vi.fn() };

/** The chat's log and its text box. */
export function showChat(messages: MessageView[] = [OWN], who: Who = SALES) {
  renderAs(
    who,
    <>
      <MessageLog {...log} waitingKeys={new Set<string>()} messages={messages} />
      <TextComposer phone={PHONE} />
    </>,
  );
}

export const openMenu = () =>
  fireEvent.click(screen.getByRole('button', { name: t.inbox.reply.menu }));
export const editButton = () => screen.getByRole('button', { name: t.inbox.correction.action });
export const editBar = () => screen.queryByRole('group', { name: t.inbox.correction.bar });
export const box = (): HTMLTextAreaElement =>
  screen.getByRole('textbox', { name: t.inbox.composer.messageLabel });

export function pickEdit(): void {
  openMenu();
  fireEvent.click(editButton());
}
