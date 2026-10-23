import { AccessibilityInfo } from 'react-native';
import type { AppTextNode } from '@/ui/AppText';
import { focusNode } from './use-focus-on-open';

const mockFindNodeHandle = jest.fn();
jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: (x: unknown) => mockFindNodeHandle(x),
}));

const node = {} as AppTextNode;

beforeEach(() => jest.clearAllMocks());

test('no node yet: nothing is focused', () => {
  const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus');
  expect(focusNode(null)).toBe(false);
  expect(focus).not.toHaveBeenCalled();
});

test('a node with a handle gets the focus', () => {
  const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
  mockFindNodeHandle.mockReturnValue(42);
  expect(focusNode(node)).toBe(true);
  expect(focus).toHaveBeenCalledWith(42);
});

test('a node without a handle, or a throwing OS, never breaks the sheet', () => {
  const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {
    throw new Error('old OS');
  });
  mockFindNodeHandle.mockReturnValue(null);
  expect(focusNode(node)).toBe(false);
  expect(focus).not.toHaveBeenCalled();
  mockFindNodeHandle.mockReturnValue(7);
  expect(focusNode(node)).toBe(false);
});
