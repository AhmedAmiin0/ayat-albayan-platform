import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { palette } from '../../../theme';
import { BubbleMeta } from './BubbleMeta';

test('theirs: the time and the line word, no ticks', async () => {
  await render(<BubbleMeta time="10:30" lead="واتساب" />);
  expect(screen.getByText('10:30')).toBeTruthy();
  expect(screen.getByText('واتساب')).toBeTruthy();
  expect(screen.queryByTestId('ticks-sent')).toBeNull();
});

test('ours: a long press on the ticks shows their times on a line of their own', async () => {
  await render(<BubbleMeta time="10:30" ticks={{ status: 'read', times: 'قُرئت 10:31' }} />);
  const ticks = screen.getByLabelText(`${t.enums.messageStatus.read} · قُرئت 10:31`);
  expect(screen.queryByTestId('ticks-times')).toBeNull();
  await fireEvent(ticks, 'longPress');
  expect(screen.getByTestId('ticks-times')).toHaveTextContent('قُرئت 10:31');
});

test('the student channel passes a plain sent: an image, not a button', async () => {
  await render(<BubbleMeta time="09:00" ticks={{ status: 'sent' }} />);
  expect(screen.getByTestId('ticks-sent').props.accessibilityRole).toBe('image');
});

test('the small print is ink-2 unless the caller asks for another ink (the channel: ink-3)', async () => {
  await render(<BubbleMeta time="09:00" />);
  expect(StyleSheet.flatten(screen.getByText('09:00').props.style).color).toBe(palette.light.ink2);
  await render(<BubbleMeta time="09:05" ink="ink3" />);
  expect(StyleSheet.flatten(screen.getByText('09:05').props.style).color).toBe(palette.light.ink3);
});
