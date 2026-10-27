import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { MessageBubble } from './MessageBubble';
import { delivered, inbound, PHONE } from '../../shared/thread-fixtures';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

// English (LTR): the same logical sides, so ours lands on the right and theirs on the left, as WhatsApp.
test('English: ours at flex-end (the right), theirs at flex-start (the left)', async () => {
  await renderWithQuery(<MessageBubble message={delivered} phone={PHONE} />);
  const ours = StyleSheet.flatten(screen.getByTestId(`bubble-${delivered.id}`).props.style);
  expect(ours.alignSelf).toBe('flex-end');
  expect(ours.borderTopEndRadius).toBeDefined();
  await renderWithQuery(<MessageBubble message={inbound} phone={PHONE} />);
  const theirs = StyleSheet.flatten(screen.getByTestId(`bubble-${inbound.id}`).props.style);
  expect(theirs.alignSelf).toBe('flex-start');
  expect(theirs.borderTopStartRadius).toBeDefined();
});
