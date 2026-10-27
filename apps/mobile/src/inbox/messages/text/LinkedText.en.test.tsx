import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { BubbleActions } from '../hooks/bubble-actions';
import { LinkedText } from './LinkedText';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

// No menu here: the body is selectable, so it copies exactly what it shows.
const plain: BubbleActions = { has: false, openMenu: jest.fn(), swipe: undefined, a11y: {} };

// English UI (LTR), as WhatsApp: an Arabic message sits on the right, an English one on the left.
test('English: an Arabic body aligns right, an English body left (the start)', async () => {
  await render(<LinkedText text="السلام عليكم" touch={plain} a11y={false} />);
  expect(StyleSheet.flatten(screen.getByText('السلام عليكم').props.style).textAlign).toBe('right');
  await render(<LinkedText text="Hello there" touch={plain} a11y={false} />);
  expect(StyleSheet.flatten(screen.getByText('Hello there').props.style).textAlign).toBe('left');
});

test('a selectable body shows its link without the added mark', async () => {
  await render(<LinkedText text="رابط https://meet.test/ab" touch={plain} a11y={false} />);
  expect(screen.getByRole('link', { name: 'https://meet.test/ab' }).props.children).toBe('https://meet.test/ab');
});
