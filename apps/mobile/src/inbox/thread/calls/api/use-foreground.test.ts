import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useForeground } from './use-foreground';

test('only «background» counts as away (iOS «inactive» still shows the app)', async () => {
  let change: (s: AppStateStatus) => void = () => undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    change = handler as (s: AppStateStatus) => void;
    return { remove: () => undefined };
  });
  const { result } = await renderHook(() => useForeground());
  await act(async () => change('background'));
  expect(result.current).toBe(false);
  await act(async () => change('inactive'));
  expect(result.current).toBe(true);
  await act(async () => change('active'));
  expect(result.current).toBe(true);
});
