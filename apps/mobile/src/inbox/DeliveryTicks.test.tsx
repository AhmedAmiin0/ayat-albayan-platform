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
  ['failed', palette.light.bad],
  ['delivered', palette.light.ink3],
] as const)('%s is drawn in its ink', async (status, ink) => {
  await render(<DeliveryTicks status={status} />);
  expect(screen.getByTestId('ticks-glyph', hidden).props.color).toBe(ink);
});

test('the times join the label, and a long press shows them', async () => {
  await render(<DeliveryTicks status="read" times="قُرئت 10:05" />);
  const ticks = screen.getByLabelText(`${word.read} · قُرئت 10:05`);
  expect(screen.queryByText('قُرئت 10:05')).toBeNull();
  await fireEvent(ticks, 'longPress');
  expect(screen.getByText('قُرئت 10:05')).toBeTruthy();
});

test('sent by hand keeps «يدويًا» beside its ticks', async () => {
  await render(<DeliveryTicks status="sent_manually" />);
  expect(screen.getByText(t.messages.manualTick)).toBeTruthy();
});
