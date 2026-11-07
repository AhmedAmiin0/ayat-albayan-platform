import { fireEvent, screen } from '@testing-library/react-native';
import { slot, SUN_17 } from '@/booking/testing/fixtures';
import { conflictLine } from '@/booking/shared/booking-errors';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { pickLesson } from '@/sales-course/testing/course-test-utils';
import { LessonTimesStep } from './LessonTimesStep';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

// Riyadh, Sunday 4 Oct: 16:30 free, 17:00 busy, 17:30 free (UTC +3).
const slots = [slot('2026-10-04T13:30:00.000Z'), slot(SUN_17, true), slot('2026-10-04T14:30:00.000Z')];

async function renderStep(onChange = jest.fn()) {
  const multi = { picks: [], onChange, onNext: jest.fn(), need: 1 };
  const step = { teacherId: 't1', tz: 'Asia/Riyadh', durationMin: 45, opens: '2026-10-02', multi };
  await renderWithQuery(<LessonTimesStep {...step} />);
  return onChange;
}

beforeEach(() => {
  fakeNow(new Date('2026-10-02T06:00:00Z'));
  mockApiFetch.mockResolvedValue({ teacher_tz: 'Asia/Riyadh', step_min: 30, slots });
});
afterEach(() => jest.useRealTimers());

test('a busy time: the grid’s conflict notice and the nearest free times; one tap uses it', async () => {
  const onChange = await renderStep();
  await pickLesson(0, { date: '2026-10-04', time: '17:00' });
  expect(onChange).toHaveBeenLastCalledWith([SUN_17]);
  expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
  expect(screen.getByText(t.lessonTimes.nearest)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.booking.changeSlot })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '17:30' }));
  expect(onChange).toHaveBeenLastCalledWith(['2026-10-04T14:30:00.000Z']);
  expect(await screen.findByText(t.lessonTimes.free)).toBeTruthy();
  expect(screen.queryByText(t.booking.conflictTitle)).toBeNull();
});

test('outside the teacher’s availability: the same notice with its own line', async () => {
  await renderStep();
  await pickLesson(0, { date: '2026-10-04', time: '22:00' });
  const outside = { kind: 'outside_availability' as const, startsAt: '2026-10-04T19:00:00.000Z', endsAt: '' };
  const line = conflictLine({ ...outside, endsAt: '2026-10-04T19:45:00.000Z' }, '24', 'Asia/Riyadh');
  expect(await screen.findByText(line)).toBeTruthy();
});

test('off the grid’s step inside a window: left to the review’s series check', async () => {
  await renderStep();
  await pickLesson(0, { date: '2026-10-04', time: '16:40' });
  expect(await screen.findByText(t.lessonTimes.unchecked)).toBeTruthy();
});

test('the slot read is the grid’s own: the teacher, the window from now and the length', async () => {
  await renderStep();
  const [path] = mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0]));
  expect(path).toContain('teacherId=t1');
  expect(path).toContain('durationMin=45');
  expect(path).toContain(`from=${encodeURIComponent('2026-10-02T06:00:00.000Z')}`);
});
