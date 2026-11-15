import { renderHook } from '@testing-library/react-native';
import { useStableHandler } from './stable-handler';

test('the same function across renders, running the latest closure', async () => {
  const { result, rerender } = await renderHook(({ n }: { n: number }) => useStableHandler((x: number) => x + n), {
    initialProps: { n: 1 },
  });
  const first = result.current;
  expect(first(1)).toBe(2);
  await rerender({ n: 10 });
  expect(result.current).toBe(first);
  expect(first(1)).toBe(11);
});
