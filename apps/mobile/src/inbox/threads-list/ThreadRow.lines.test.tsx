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

/** The body's direct lines (name+time, preview+badge). */
const lines = () => screen.getByTestId('chat-row-title').parent?.parent?.children ?? [];

test('a named contact: two lines, the name alone, no phone and no tags', async () => {
  await draw({ display_name: 'سارة المنصور', lead_source: 'facebook_ad' });
  expect(screen.getByTestId('chat-row-title').props.children).toBe('سارة المنصور');
  expect(screen.queryByText(ltr(formatPhone(thread.phone_e164)))).toBeNull();
  expect(screen.queryByText(t.enums.leadStatus.new)).toBeNull();
  expect(screen.queryByText(t.enums.leadSource.facebook_ad)).toBeNull();
  expect(screen.queryByTestId('thread-meta')).toBeNull();
  expect(lines()).toHaveLength(2);
});

test('no name: the LTR phone takes line 1', async () => {
  await draw({ display_name: null });
  const title = screen.getByTestId('chat-row-title');
  expect(title.props.children).toBe(ltr(formatPhone(thread.phone_e164)));
  expect(title.props.numberOfLines).toBe(1);
  expect(lines()).toHaveLength(2);
});

test('a subscribed guardian: no role word or chip, the ring says it', async () => {
  await draw({ guardian_id: 'g-1', lead_source: null, subscribed: true, badge: 'subscribed', ring: 'subscribed' });
  expect(screen.queryByText(t.inbox.kind.guardian)).toBeNull();
  expect(screen.queryByText(t.inbox.subscription.badge.subscribed)).toBeNull();
  expect(screen.getByTestId('avatar-ring-subscribed')).toBeTruthy();
});

test('a teacher sees two lines: no phone, no ring', async () => {
  await draw({ display_name: null }, { kind: 'teacher', teacherId: 't-1' });
  expect(screen.queryByText(/⁦/)).toBeNull();
  expect(screen.getByTestId('avatar-ring-none')).toBeTruthy();
  expect(lines()).toHaveLength(2);
});

test('the preview draws WhatsApp markup without its asterisks', async () => {
  await draw({ last_direction: 'inbound', last_body: 'مرحبًا *أكاديمية النور*' });
  const preview = screen.getByTestId('thread-preview');
  expect(preview.props.numberOfLines).toBe(1);
  expect(screen.getByText('أكاديمية النور')).toBeTruthy();
  expect(screen.queryByText(/\*/)).toBeNull();
});

test('a message of several lines previews as one line, its breaks folded into spaces', async () => {
  await draw({ last_direction: 'inbound', last_body: 'السلام عليكم\n\nموعد الحلقة  اليوم\n' });
  expect(screen.getByText('السلام عليكم موعد الحلقة اليوم')).toBeTruthy();
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
