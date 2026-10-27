import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useFollowingDay } from './use-following-day';

const setup = () => renderHook(({ current }: { current: string }) => useFollowingDay(current), { initialProps: { current: '2026-10-24' } });

test('the current week moves on with the clock', () => {
  const { result, rerender } = setup();
  rerender({ current: '2026-10-31' });
  expect(result.current[0]).toBe('2026-10-31');
});

test('a week the user stepped to stays; stepping back to the current one follows again', () => {
  const { result, rerender } = setup();
  act(() => result.current[1]('2026-10-17'));
  rerender({ current: '2026-10-31' });
  expect(result.current[0]).toBe('2026-10-17');
  act(() => result.current[1]('2026-10-31'));
  rerender({ current: '2026-11-07' });
  expect(result.current[0]).toBe('2026-11-07');
});
