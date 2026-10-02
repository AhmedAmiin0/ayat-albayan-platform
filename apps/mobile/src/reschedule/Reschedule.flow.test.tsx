import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { lesson, pending } from '@/today/fixtures';
import { NOW, SAT_17, SLOTS, SUN_17 } from './fixtures';
import { RescheduleSheet } from './RescheduleSheet';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const dayKey = ['lessons', 'day', { date: '2026-10-01', tz: 'Asia/Riyadh' }];
const moved = (startsAt: string) =>
  lesson({ id: 'new', starts_at: startsAt, ends_at: new Date(Date.parse(startsAt) + 45 * 60_000).toISOString() });

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(SLOTS);
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

async function openSheet(l = pending) {
  const onClose = jest.fn();
  const client = createTestQueryClient();
  client.setQueryData(dayKey, [l]);
  await renderWithQuery(<RescheduleSheet lesson={l} onClose={onClose} />, client);
  await screen.findByRole('radio', { name: '17:00' });
  return { onClose, client };
}

test('the free slots of the same teacher, 14 days, the lesson’s length and students; busy ones hidden', async () => {
  await openSheet();
  expect(mockApiFetch).toHaveBeenCalledWith(
    `/booking/slots?teacherId=t1&from=${encodeURIComponent('2026-10-01T13:20:00.000Z')}` +
      `&to=${encodeURIComponent('2026-10-15T13:20:00.000Z')}&durationMin=45&studentIds=s1`,
  );
  expect(screen.getByRole('header', { name: t.lessons.rescheduleTitle })).toBeTruthy();
  expect(screen.getByText(t.reschedule.current.replace('{when}', 'الخميس 1 أكتوبر 16:00 بتوقيت الرياض'))).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'السبت 3 أكتوبر', checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'الأحد 4 أكتوبر' })).toBeTruthy();
  expect(screen.getByRole('radio', { name: '18:00' })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: '19:00' })).toBeNull();
  // Nothing picked yet: «غيّر الميعاد» waits.
  expect(screen.getByRole('button', { name: t.lessons.rescheduleSubmit })).toBeDisabled();
  expect(screen.getByText(t.lessons.newTimeHint)).toBeTruthy();
});

test('«الحلقة دي بس»: Sunday 17:00 sends scope one; the guardian’s confirmation is said', async () => {
  mockApiSend.mockResolvedValue(moved(SUN_17));
  const { onClose, client } = await openSheet();
  await fireEvent.press(screen.getByRole('radio', { name: 'الأحد 4 أكتوبر' }));
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  expect(screen.getByText(t.booking.picked.replace('{when}', 'الأحد 4 أكتوبر 17:00 بتوقيت الرياض'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));

  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/reschedule', { scope: 'one', startsAt: SUN_17 });
  expect(await screen.findByText(t.lessons.rescheduled)).toBeTruthy();
  expect(screen.getByText(t.reschedule.newWhen.replace('{when}', 'الأحد 4 أكتوبر 17:00 بتوقيت الرياض'))).toBeTruthy();
  expect(screen.getByText(t.enums.lessonStatus.scheduled)).toBeTruthy();
  expect(screen.getByText(t.reschedule.guardianNote)).toBeTruthy();
  // Today and the calendars refetch.
  expect(client.getQueryState(dayKey)?.isInvalidated).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: t.reschedule.done }));
  expect(onClose).toHaveBeenCalled();
});

test('«الحلقة دي وكل اللي بعدها»: the new weekly rule, the slot’s day plus the days added', async () => {
  mockApiSend.mockResolvedValue(moved(SAT_17));
  await openSheet();
  await fireEvent.press(screen.getByRole('radio', { name: t.lessons.scope.rule }));
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  expect(screen.getByRole('checkbox', { name: t.enums.weekday['6'], checked: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('checkbox', { name: t.enums.weekday['2'] }));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));

  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/reschedule', {
    scope: 'rule',
    newRule: {
      teacherId: 't1',
      byday: [2, 6],
      startTimeLocal: '17:00',
      tz: 'Asia/Riyadh',
      durationMin: 45,
      startsOn: '2026-10-03',
    },
  });
  expect(await screen.findByText(t.reschedule.seriesMoved)).toBeTruthy();
});

test('a lesson outside a series moves alone: no scope choice', async () => {
  await openSheet(lesson({ id: 'solo', rule_id: null }));
  expect(screen.queryByLabelText(t.lessons.scopeLabelMove)).toBeNull();
  expect(screen.queryByRole('radio', { name: t.lessons.scope.rule })).toBeNull();
});

test('closed: nothing renders and nothing is asked', async () => {
  await renderWithQuery(<RescheduleSheet lesson={null} onClose={jest.fn()} />);
  expect(screen.queryByRole('header', { name: t.lessons.rescheduleTitle })).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalled();
});
