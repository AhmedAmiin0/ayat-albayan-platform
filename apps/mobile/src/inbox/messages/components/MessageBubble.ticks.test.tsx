import type { MessageView } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MessageBubble } from './MessageBubble';
import { stamp } from '../hooks/message-text';
import { delivered, failed, inbound, PHONE } from '../../shared/thread-fixtures';
import { ticksLabel } from '../../shared/ticks.helpers';

const word = t.enums.messageStatus;
const show = (m: MessageView) => renderWithQuery(<MessageBubble message={m} phone={PHONE} />);

test('ours: the ticks named by the status word and its times, no status chip', async () => {
  await show(delivered);
  const label = `${word.delivered} · ${t.messages.sentAt.replace('{time}', stamp(delivered.sent_at ?? '', { cycle: '24' }))}`;
  expect(screen.getByLabelText(new RegExp(`^${label}`)).props.testID).toBe('ticks-delivered');
  expect(screen.queryByText(word.delivered)).toBeNull();
});

test('read: the read ticks', async () => {
  await show({ ...delivered, status: 'read', read_at: '2026-10-02T08:06:00Z' });
  expect(screen.getByLabelText(ticksLabel(word.read)).props.testID).toBe('ticks-read');
});

test('queued: the clock; sent by hand: two ticks and «يدويًا»', async () => {
  await show({ ...delivered, status: 'queued', sent_at: null, delivered_at: null });
  expect(screen.getByLabelText(word.queued).props.testID).toBe('ticks-pending');
  await show({ ...delivered, id: 'm9', status: 'sent_manually' });
  expect(screen.getByText(t.messages.manualTick)).toBeTruthy();
});

test('failed: the saffron «!» with its word and why, and the bubble still renders its text', async () => {
  await show(failed);
  const why = t.messages.errorLine.replace('{reason}', t.messages.errors['131049']);
  // The admin's (full access, the default thread mode): a button that says why, as WhatsApp's «!».
  const ticks = screen.getByRole('button', { name: `${word.failed} — ${why}` });
  expect(ticks.props.testID).toBe('ticks-failed');
  expect(screen.getByText(word.failed)).toBeTruthy();
  expect(screen.getByText(why).props.numberOfLines).toBe(2);
  expect(screen.getByText(failed.body ?? '')).toBeTruthy();
  // The actions live in the sheet now: no full-width buttons inside the bubble.
  expect(screen.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(screen.queryByRole('button', { name: t.messages.clickToChat })).toBeNull();
});

test('a long press shows the times on their own line under the meta row, and hides them again', async () => {
  await show(delivered);
  const ticks = screen.getByLabelText(ticksLabel(word.delivered));
  expect(screen.queryByTestId('ticks-times')).toBeNull();
  await fireEvent(ticks, 'longPress');
  const line = screen.getByTestId('ticks-times');
  expect(line.props.children).toContain(t.messages.deliveredAt.replace('{time}', stamp(delivered.delivered_at ?? '', { cycle: '24' })));
  // Its own line, not inside the ticks (the stamp + ticks row): it wraps in the bubble on its own.
  expect(within(ticks).queryByTestId('ticks-times')).toBeNull();
  await fireEvent(ticks, 'longPress');
  expect(screen.queryByTestId('ticks-times')).toBeNull();
});

test('theirs: no ticks', async () => {
  await show(inbound);
  expect(screen.queryByTestId(/^ticks-/)).toBeNull();
});
