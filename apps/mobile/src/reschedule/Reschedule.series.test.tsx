import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { NOW, SLOTS, SUN_17 } from './fixtures';
import { RescheduleSheet } from './RescheduleSheet';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(SLOTS);
  mockApiSend.mockReset().mockResolvedValue(lesson({ id: 'new', starts_at: SUN_17 }));
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

async function open(l: ReturnType<typeof lesson>) {
  await renderWithQuery(<RescheduleSheet lesson={l} onClose={jest.fn()} />, createTestQueryClient());
}

test('a lesson three weeks out opens on its own week (verifier: the picker only offered the next 14 days)', async () => {
  await open(lesson({ id: 'far', starts_at: '2026-10-22T14:00:00.000Z', ends_at: '2026-10-22T14:45:00.000Z' }));
  await screen.findByRole('radio', { name: '17:00' });
  const from = encodeURIComponent('2026-10-16T21:00:00.000Z'); // Saturday 17 Oct, Riyadh midnight
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining(`from=${from}`));
  expect(screen.getByRole('button', { name: t.schedule.prevWeek })).not.toBeDisabled();
});

test('the series keeps its rhythm: Sun+Thu, its Thu moved 3 days on to Sun → Sun+Wed, the slot’s day locked; days before the lesson hidden', async () => {
  // Thursday 1 Oct 17:00 Riyadh, a Sun+Thu series.
  await open(lesson({ id: 'thu', starts_at: '2026-10-01T14:00:00.000Z', ends_at: '2026-10-01T14:45:00.000Z', rule_byday: [0, 4] }));
  await fireEvent.press(await screen.findByRole('radio', { name: t.lessons.scope.rule }));
  await fireEvent.press(await screen.findByRole('radio', { name: 'الأحد 4 أكتوبر' }));
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  const sunday = screen.getByRole('checkbox', { name: t.enums.weekday['0'] });
  expect(sunday.props.accessibilityState).toMatchObject({ checked: true, disabled: true });
  expect(screen.getByRole('checkbox', { name: t.enums.weekday['3'], checked: true })).toBeTruthy();
  expect(screen.getByText(t.booking.dayLocked)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
  expect(mockApiSend).toHaveBeenCalledWith(
    'POST',
    '/lessons/thu/reschedule',
    expect.objectContaining({ scope: 'rule', newRule: expect.objectContaining({ byday: [0, 3], startsOn: '2026-10-04' }) }),
  );
});

test('series scope on a Sunday lesson: Saturday’s slots (before it) are not offered', async () => {
  await open(lesson({ id: 'sun', starts_at: SUN_17, ends_at: '2026-10-04T14:45:00.000Z' }));
  await screen.findByRole('radio', { name: 'السبت 3 أكتوبر' });
  await fireEvent.press(screen.getByRole('radio', { name: t.lessons.scope.rule }));
  expect(screen.queryByRole('radio', { name: 'السبت 3 أكتوبر' })).toBeNull();
  expect(screen.getByRole('radio', { name: 'الأحد 4 أكتوبر' })).toBeTruthy();
});
