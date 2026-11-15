import { act, renderHook } from '@testing-library/react-native';
import { useFollowingDay } from './use-following-day';

const setup = (initial?: string) =>
  renderHook(({ today }: { today: string }) => useFollowingDay(today, initial), { initialProps: { today: '2026-10-26' } });

test('starts on today and moves with it at midnight', async () => {
  const { result, rerender } = await setup();
  expect(result.current[0]).toBe('2026-10-26');
  await rerender({ today: '2026-10-27' });
  expect(result.current[0]).toBe('2026-10-27');
});

test('a day the user picked stays when today changes', async () => {
  const { result, rerender } = await setup();
  await act(async () => result.current[1]('2026-10-24'));
  await rerender({ today: '2026-10-27' });
  expect(result.current[0]).toBe('2026-10-24');
});

test('picking today again follows the clock again', async () => {
  const { result, rerender } = await setup();
  await act(async () => result.current[1]('2026-10-24'));
  await act(async () => result.current[1]('2026-10-26'));
  await rerender({ today: '2026-10-27' });
  expect(result.current[0]).toBe('2026-10-27');
});

test('an opening day other than today stays; one equal to today follows', async () => {
  const other = await setup('2026-10-20');
  await other.rerender({ today: '2026-10-27' });
  expect(other.result.current[0]).toBe('2026-10-20');
  const same = await setup('2026-10-26');
  await same.rerender({ today: '2026-10-27' });
  expect(same.result.current[0]).toBe('2026-10-27');
});

test('a day picked ahead becomes today, then follows the clock (two midnights)', async () => {
  const { result, rerender } = await setup();
  await act(async () => result.current[1]('2026-10-27'));
  await rerender({ today: '2026-10-27' });
  expect(result.current[0]).toBe('2026-10-27');
  await rerender({ today: '2026-10-28' });
  expect(result.current[0]).toBe('2026-10-28');
});
