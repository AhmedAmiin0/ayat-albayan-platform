import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { leftToRight } from '../../shared/physical-row.helpers';
import { ChatHeader } from './ChatHeader';

// Arabic (jest.setup: RTL). As WhatsApp (owner 2026-10-27): back on the physical left, icons on the right.
test('Arabic: back first on the physical left, the name beside it, the icons last on the right', async () => {
  await render(<ChatHeader title="هدى سالم" subtitle="عميل محتمل" onBack={jest.fn()} trailing={<View testID="icons" />} />);
  expect(leftToRight(screen.getByTestId('chat-header'), true)).toEqual([t.common.back, 'chat-names', 'icons']);
});

test('Arabic: the back chevron points left (logical next in RTL); the names hug the physical left', async () => {
  await render(<ChatHeader title="هدى سالم" subtitle="عميل محتمل" onBack={jest.fn()} />);
  const back = screen.getByRole('button', { name: t.common.back });
  expect(within(back).getByTestId('chevron-next', { includeHiddenElements: true })).toBeTruthy();
  // alignItems flex-end is the inline-end: the left in RTL.
  expect(StyleSheet.flatten(screen.getByTestId('chat-names').props.style).alignItems).toBe('flex-end');
  expect(StyleSheet.flatten(screen.getByTestId('chat-header').props.style)).toMatchObject({ marginEnd: -10, marginStart: 0 });
});
