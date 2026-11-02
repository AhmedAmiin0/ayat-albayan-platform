import { fireEvent, render, screen } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { CourseCheckNotice, type CourseCheckNoticeProps } from './CourseCheckNotice';

const refetch = jest.fn();
const failed = (error: unknown): CourseCheckNoticeProps['check'] => ({ isPending: false, error, data: undefined, refetch });

beforeEach(() => jest.clearAllMocks());

test('a check that failed (a server error) offers to run it again', async () => {
  await render(<CourseCheckNotice check={failed(new ApiError(500, { code: 'internal' }))} onChangeSlot={jest.fn()} />);
  expect(screen.getByText(t.common.error)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

test('offline: its own line, and a retry', async () => {
  await render(<CourseCheckNotice check={failed(new TypeError('Network request failed'))} onChangeSlot={jest.fn()} />);
  expect(screen.getByText(t.booking.mobile.offline)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.mobile.retry })).toBeTruthy();
});

test('the course guard’s refusal keeps its line and offers no retry', async () => {
  const error = new ApiError(422, { code: 'days_count_mismatch', message: 'x' });
  await render(<CourseCheckNotice check={failed(error)} onChangeSlot={jest.fn()} />);
  expect(screen.getByText(t.booking.error.days_count_mismatch)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.mobile.retry })).toBeNull();
});

test('a clash in any week: its line and «اختر موعدًا آخر»', async () => {
  const onChangeSlot = jest.fn();
  const conflicts = [{ kind: 'teacher_busy' as const, startsAt: '2026-10-22T15:00:00.000Z', endsAt: '2026-10-22T15:45:00.000Z' }];
  await render(<CourseCheckNotice check={{ isPending: false, error: null, data: { conflicts }, refetch }} onChangeSlot={onChangeSlot} />);
  await fireEvent.press(screen.getByRole('button', { name: t.booking.changeSlot }));
  expect(onChangeSlot).toHaveBeenCalledTimes(1);
});

const COURSE_CODES = [
  [400, 'starts_at_mismatch'],
  [400, 'starts_before_course'],
  [400, 'starts_before_subscription'],
  [400, 'no_change'],
  [409, 'course_changed'],
  [409, 'course_exists'],
] as const;

test.each(COURSE_CODES)('a %i %s from the course check: its own line (booking.error), no retry', async (status, code) => {
  await render(<CourseCheckNotice check={failed(new ApiError(status, { code, message: 'x' }))} onChangeSlot={jest.fn()} />);
  expect(screen.getByText(t.booking.error[code])).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.mobile.retry })).toBeNull();
});
