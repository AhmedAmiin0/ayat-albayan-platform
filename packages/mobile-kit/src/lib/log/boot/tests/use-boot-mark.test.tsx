import { act, renderHook } from '@testing-library/react-native';
import { reportFirstScreen } from '../boot-mark';
import { useBootMark } from '../use-boot-mark';

jest.mock('../boot-mark', () => ({ reportFirstScreen: jest.fn() }));

beforeEach(() => jest.mocked(reportFirstScreen).mockClear());

test('nothing is reported while the startup cover is still up', async () => {
  await renderHook(() => useBootMark(false));
  expect(reportFirstScreen).not.toHaveBeenCalled();
});

test('the first screen is reported when the app becomes ready', async () => {
  const hook = await renderHook(({ ready }: { ready: boolean }) => useBootMark(ready), {
    initialProps: { ready: false },
  });
  await act(() => hook.rerender({ ready: true }));
  expect(reportFirstScreen).toHaveBeenCalledTimes(1);
});
