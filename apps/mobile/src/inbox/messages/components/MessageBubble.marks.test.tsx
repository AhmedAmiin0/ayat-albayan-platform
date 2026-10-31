import type { MessageView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MessageBubble } from './MessageBubble';
import { delivered, inbound, PHONE } from '@/inbox/shared/thread-fixtures';

// WhatsApp's edits and deletes (owner 2026-10-30): an edited message shows its new text and
// «تم التعديل»; a deleted one only «تم حذف هذه الرسالة»; Kapso's «errors» echo is the ad's welcome.
const show = (m: MessageView) => renderWithQuery(<MessageBubble message={m} phone={PHONE} />);

test('edited: the new text with «تم التعديل» by the time', async () => {
  await show({ ...delivered, body: 'الحلقة الساعة 6', edited: true });
  expect(screen.getByText('الحلقة الساعة 6')).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${t.inbox.edited} · `))).toBeTruthy();
});

test('not edited: no label', async () => {
  await show(delivered);
  expect(screen.queryByText(new RegExp(t.inbox.edited))).toBeNull();
});

test('deleted (ours or theirs): only «تم حذف هذه الرسالة», no text or file', async () => {
  const gone = {
    body: null,
    media_mime: null,
    media_url: null,
    interactive_payload: null,
    deleted: true,
  };
  await show({ ...inbound, ...gone });
  expect(screen.getByText(t.inbox.deletedMessage)).toBeTruthy();
  expect(screen.queryByText(inbound.body ?? '')).toBeNull();
  await show({ ...delivered, id: 'm-del', ...gone });
  expect(screen.getByText(t.inbox.deletedMessage)).toBeTruthy();
  expect(screen.queryByText(delivered.body ?? '')).toBeNull();
});

test("the ad's welcome: its own text, else the label; an unsupported echo is muted words", async () => {
  const echo = { ...delivered, body: null, template_key: null, template: null };
  await show({ ...echo, interactive_payload: { type: 'errors', welcome: 'أهلًا بك' } });
  expect(screen.getByText('أهلًا بك')).toBeTruthy();
  await show({ ...echo, id: 'm-ad', interactive_payload: { type: 'errors', welcome: null } });
  expect(screen.getByText(t.inbox.adWelcome)).toBeTruthy();
  await show({ ...echo, id: 'm-uns', interactive_payload: { type: 'unsupported' } });
  expect(screen.getByText(t.inbox.unsupportedEcho)).toBeTruthy();
  expect(screen.queryByText(/\[(errors|unsupported)\]/)).toBeNull();
});
