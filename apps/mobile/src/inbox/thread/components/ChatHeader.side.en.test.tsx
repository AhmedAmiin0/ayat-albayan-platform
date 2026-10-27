import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { leftToRight } from '../../shared/physical-row.helpers';
import { ChatHeader } from './ChatHeader';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('English: the mirror of Arabic, back on the left, the name beside it, the icons on the right', async () => {
  await render(<ChatHeader title="Huda Salem" subtitle="Lead" onBack={jest.fn()} trailing={<View testID="icons" />} />);
  expect(leftToRight(screen.getByTestId('chat-header'), false)).toEqual([t.common.back, 'chat-names', 'icons']);
  const back = screen.getByRole('button', { name: t.common.back });
  expect(within(back).getByTestId('chevron-prev', { includeHiddenElements: true })).toBeTruthy(); // left in LTR
  expect(StyleSheet.flatten(screen.getByTestId('chat-names').props.style).alignItems).toBe('flex-start');
});
