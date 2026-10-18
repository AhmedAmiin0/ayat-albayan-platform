import type { MessageView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { MessageBubble } from './MessageBubble';
import { stamp } from './message-text';
import { delivered, failed, inbound, PHONE } from './thread-fixtures';
import { ticksLabel } from './ticks.helpers';

const word = t.enums.messageStatus;
const show = (m: MessageView) => renderWithQuery(<MessageBubble message={m} phone={PHONE} />);

test('ours: the ticks named by the status word and its times, no status chip', async () => {
  await show(delivered);
  const label = `${word.delivered} · ${t.messages.sentAt.replace('{time}', stamp(delivered.sent_at ?? ''))}`;
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

test('failed: the red «!», and the bubble still renders its text', async () => {
  await show(failed);
  expect(screen.getByLabelText(word.failed).props.testID).toBe('ticks-failed');
  expect(screen.getByText(failed.body ?? '')).toBeTruthy();
});

test('theirs: no ticks', async () => {
  await show(inbound);
  expect(screen.queryByTestId(/^ticks-/)).toBeNull();
});
