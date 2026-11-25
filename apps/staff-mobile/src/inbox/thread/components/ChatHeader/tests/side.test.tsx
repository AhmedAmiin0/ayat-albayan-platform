import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { leftToRight } from '@/inbox/shared/physical-row.helpers';
import { ChatHeader } from '@/inbox/thread/components/ChatHeader/ChatHeader';

// Arabic (jest.setup: RTL). As WhatsApp in Arabic: back on the right, the icons on the left.
test('Arabic: the icons on the physical left, the name in the middle, back on the right', async () => {
  await render(<ChatHeader title="هدى سالم" subtitle="عميل محتمل" onBack={jest.fn()} trailing={<View testID="icons" />} />);
  expect(leftToRight(screen.getByTestId('chat-header'), true)).toEqual(['icons', 'chat-names', t.common.back]);
});

test('Arabic: a logical row; the back chevron points back (prev, to the right); the names hug the start', async () => {
  await render(<ChatHeader title="هدى سالم" subtitle="عميل محتمل" onBack={jest.fn()} />);
  const back = screen.getByRole('button', { name: t.common.back });
  expect(within(back).getByTestId('chevron-prev', { includeHiddenElements: true })).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId('chat-names').props.style).alignItems).toBe('flex-start');
  const header = StyleSheet.flatten(screen.getByTestId('chat-header').props.style);
  expect(header).toMatchObject({ flexDirection: 'row', marginStart: -10 });
  expect(header.marginEnd).toBeUndefined();
});
