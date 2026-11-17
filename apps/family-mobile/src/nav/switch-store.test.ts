import { act, renderHook } from '@testing-library/react-native';
import {
  closeChildSwitch,
  openChildSwitch,
  showSwitched,
  SWITCH_NOTICE_MS,
  useChildSwitch,
} from './switch-store';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('the sheet opens from a header and closes', async () => {
  const { result } = await renderHook(() => useChildSwitch());
  await act(() => openChildSwitch());
  expect(result.current.open).toBe(true);
  await act(() => closeChildSwitch());
  expect(result.current.open).toBe(false);
});

test('a switch closes the sheet; the note stays a few seconds, a second switch restarts it', async () => {
  const { result } = await renderHook(() => useChildSwitch());
  await act(() => openChildSwitch());
  await act(() => showSwitched('أ'));
  expect(result.current).toEqual({ open: false, notice: 'أ' });
  await act(() => jest.advanceTimersByTime(SWITCH_NOTICE_MS - 1000));
  await act(() => showSwitched('ب'));
  await act(() => jest.advanceTimersByTime(SWITCH_NOTICE_MS - 1000));
  expect(result.current.notice).toBe('ب');
  await act(() => jest.advanceTimersByTime(1000));
  expect(result.current.notice).toBeNull();
});
