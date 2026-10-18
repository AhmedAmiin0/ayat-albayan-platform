import { MESSAGE_STATUSES, type MessageStatus } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { palette } from '@/theme';
import { DeliveryTicks } from './DeliveryTicks';

const KIND: Record<MessageStatus, string> = {
  queued: 'pending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  sent_manually: 'manual',
};
const word = t.enums.messageStatus;
const hidden = { includeHiddenElements: true };

test.each(MESSAGE_STATUSES)('%s: an image named by its status word', async (status) => {
  await render(<DeliveryTicks status={status} />);
  const ticks = screen.getByLabelText(word[status]);
  expect(ticks.props.testID).toBe(`ticks-${KIND[status]}`);
  expect(ticks.props.accessibilityRole).toBe('image');
  expect(ticks.props.accessibilityState?.disabled).toBeFalsy();
});

test.each([
  ['read', palette.light.read],
  ['failed', palette.light.act],
  ['delivered', palette.light.tick],
  ['queued', palette.light.tick],
] as const)('%s is drawn in its ink', async (status, ink) => {
  await render(<DeliveryTicks status={status} />);
  expect(screen.getByTestId('ticks-glyph', hidden).props.color).toBe(ink);
});

test('no times: a plain image, not a Pressable that would swallow a tap', async () => {
  await render(<DeliveryTicks status="delivered" />);
  expect(screen.getByLabelText(word.delivered).props.onLongPress).toBeUndefined();
});

test('the times join the label, and a long press asks the bubble to show them', async () => {
  const onLongPress = jest.fn();
  await render(<DeliveryTicks status="read" times="قُرئت 10:05" onLongPress={onLongPress} />);
  const ticks = screen.getByLabelText(`${word.read} · قُرئت 10:05`);
  expect(screen.queryByText('قُرئت 10:05')).toBeNull();
  await fireEvent(ticks, 'longPress');
  expect(onLongPress).toHaveBeenCalledTimes(1);
});

test('failed says «لم تُرسل» beside its «!»; sent by hand «يدويًا», never both', async () => {
  await render(<DeliveryTicks status="failed" />);
  expect(screen.getByText(word.failed)).toBeTruthy();
  expect(screen.queryByText(t.messages.manualTick)).toBeNull();
  await render(<DeliveryTicks status="sent_manually" />);
  expect(screen.getByText(t.messages.manualTick)).toBeTruthy();
});

test('in a list row: hidden from the reader (the row says the word), no failed word (its chip does)', async () => {
  await render(<DeliveryTicks status="failed" inList />);
  expect(screen.queryByLabelText(word.failed)).toBeNull();
  expect(screen.getByTestId('ticks-failed', hidden).props.importantForAccessibility).toBe('no-hide-descendants');
  expect(screen.queryByText(word.failed, hidden)).toBeNull();
});
