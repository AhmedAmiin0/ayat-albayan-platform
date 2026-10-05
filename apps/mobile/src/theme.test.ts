import { renderHook } from '@testing-library/react-native';
import { palette, type, useTheme } from './theme';

const mockScheme = jest.fn();
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme(),
}));

test.each([
  ['light', 'light'],
  ['dark', 'dark'],
  [null, 'light'],
  ['unspecified', 'light'],
])('system scheme %s → %s tokens', async (scheme, name) => {
  mockScheme.mockReturnValue(scheme);
  const { result } = await renderHook(() => useTheme());
  expect(result.current.name).toBe(name);
  expect(result.current.color).toBe(palette[name as 'light' | 'dark']);
});

test('dark is soft green-grey: green-grey margin, light ink, light link green', async () => {
  mockScheme.mockReturnValue('dark');
  const { result } = await renderHook(() => useTheme());
  expect(result.current.color.margin).toBe('#1a211e');
  expect(result.current.color.ink).toBe('#e9efec');
  expect(result.current.color.lapis).toBe('#5eead4');
  expect(result.current.color.lapisFill).toBe('#047857');
  expect(result.current.elevation.page).toMatch(/^0 18px 40px -16px rgba/);
});

test('same object per scheme, so memoised styles stay stable', async () => {
  mockScheme.mockReturnValue('light');
  const { result, rerender } = await renderHook(() => useTheme());
  const first = result.current;
  await rerender({});
  expect(result.current).toBe(first);
});

test('both themes define the same tokens', () => {
  expect(Object.keys(palette.dark).sort()).toEqual(Object.keys(palette.light).sort());
});

test('Arabic line-heights: 1.5 Amiri, 1.6 Plex', () => {
  expect(type.lineHeight(type.size.h1, true)).toBe(48);
  expect(type.lineHeight(type.size.base)).toBe(26);
});
