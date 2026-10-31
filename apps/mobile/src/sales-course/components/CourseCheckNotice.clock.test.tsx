import { act, render, screen } from '@testing-library/react-native';
import { conflictLine } from '@/booking/shared/booking-errors';
import { SUN_17 } from '@/booking/testing/fixtures';
import { setClockPref } from '@/core/lib/clock';
import { ApiError } from '@/core/lib/http/api';
import { CourseCheckNotice } from './CourseCheckNotice';

const clash = { kind: 'teacher_busy', startsAt: SUN_17, endsAt: '2026-10-04T14:45:00.000Z' } as const;

test('a refused check (bookFailure) re-words its clash after a 24 → 12 h switch, no remount', async () => {
  await act(async () => setClockPref('24'));
  const error = new ApiError(409, { code: 'conflict', conflicts: [clash] });
  const check = { isPending: false, error, data: undefined, refetch: jest.fn() };
  await render(<CourseCheckNotice check={check} onChangeSlot={jest.fn()} />);
  expect(screen.getByText(conflictLine(clash, '24'))).toBeTruthy();

  await act(async () => setClockPref('12'));
  expect(screen.getByText(conflictLine(clash, '12'))).toBeTruthy();
  expect(screen.queryByText(conflictLine(clash, '24'))).toBeNull();
});
