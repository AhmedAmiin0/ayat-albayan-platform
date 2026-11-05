import { formatPhone, type ThreadView } from '@ab/shared';
import { render, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { thread } from '@/inbox/shared/thread-fixtures';
import type { ThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { useThreadRow } from './ThreadRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// Invented people and numbers only (the repo is public).
const NOW = new Date('2026-11-05T12:00:00Z');
const ADMIN: ThreadMode = { kind: 'admin' };

function Row({ item, mode = ADMIN }: { item: ThreadView; mode?: ThreadMode }) {
  return useThreadRow(mode, '', NOW)({ item });
}

const draw = (item: Partial<ThreadView>, mode?: ThreadMode) =>
  render(<Row item={{ ...thread, ...item }} mode={mode} />);

/** The body's direct lines (name+time, preview+badge, meta). */
const lines = () => screen.getByTestId('chat-row-title').parent?.parent?.children ?? [];

test('a named contact: the name alone on line 1, the phone LTR-isolated on the meta line', async () => {
  await draw({ display_name: 'سارة المنصور', lead_source: 'facebook_ad' });
  expect(screen.getByTestId('chat-row-title').props.children).toBe('سارة المنصور');
  const meta = within(screen.getByTestId('thread-meta'));
  expect(meta.getByText(ltr(formatPhone(thread.phone_e164)))).toBeTruthy();
  expect(meta.getByText(t.enums.leadStatus.new)).toBeTruthy();
  expect(meta.getByText(t.enums.leadSource.facebook_ad)).toBeTruthy();
  expect(lines()).toHaveLength(3);
});

test('no name: the LTR phone takes line 1 and leaves the meta line', async () => {
  await draw({ display_name: null });
  const title = screen.getByTestId('chat-row-title');
  expect(title.props.children).toBe(ltr(formatPhone(thread.phone_e164)));
  expect(title.props.numberOfLines).toBe(1);
  expect(within(screen.getByTestId('thread-meta')).queryByText(/⁦/)).toBeNull();
});

test('a guardian on file: the role word, no lead chip, one unwrapped meta line', async () => {
  await draw({ guardian_id: 'g-1', lead_source: null, subscribed: true, badge: 'subscribed' });
  const meta = screen.getByTestId('thread-meta');
  expect(within(meta).getByText(t.inbox.kind.guardian)).toBeTruthy();
  expect(within(meta).queryByText(t.enums.leadStatus.new)).toBeNull();
  expect(within(meta).getByText(t.inbox.subscription.badge.subscribed)).toBeTruthy();
  expect(meta.props.style).not.toHaveProperty('flexWrap', 'wrap');
});

test('a teacher sees two lines: no meta line, no phone', async () => {
  await draw({ display_name: null }, { kind: 'teacher', teacherId: 't-1' });
  expect(screen.queryByTestId('thread-meta')).toBeNull();
  expect(screen.queryByText(/⁦/)).toBeNull();
  expect(lines()).toHaveLength(2);
});

test('the preview draws WhatsApp markup without its asterisks', async () => {
  await draw({ last_direction: 'inbound', last_body: 'مرحبًا *أكاديمية النور*' });
  const preview = screen.getByTestId('thread-preview');
  expect(preview.props.numberOfLines).toBe(1);
  expect(screen.getByText('أكاديمية النور')).toBeTruthy();
  expect(screen.queryByText(/\*/)).toBeNull();
});

test('the time sits on line 1, the unread count on line 2', async () => {
  await draw({ last_direction: 'inbound', unread_count: 3, last_message_at: NOW.toISOString() });
  const [first, second] = lines();
  expect(within(first as never).getByTestId('thread-time')).toBeTruthy();
  expect(within(second as never).getByTestId('unread-count')).toBeTruthy();
});

test('the reader hears our marked preview without its markers', async () => {
  await draw({ last_direction: 'outbound', last_status: 'read', last_body: '*موعد* الحلقة' });
  const label = String(screen.getByTestId('thread-preview').props.accessibilityLabel);
  expect(label).toContain('موعد الحلقة');
  expect(label).not.toContain('*');
});
