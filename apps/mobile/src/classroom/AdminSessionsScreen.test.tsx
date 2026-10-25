import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { dayLabel } from '@/calendar/week';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/fixtures';
import { AdminSessionsScreen } from './AdminSessionsScreen';

const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiSend: jest.fn(),
}));

afterEach(() => jest.useRealTimers());
beforeEach(() => jest.clearAllMocks());

// 13:10Z: the 16:00 Riyadh lesson is open (now); the 18:00 one is upcoming; the 08:00 one is over.
const rows = [
  lesson({ id: 'now' }),
  lesson({ id: 'later', starts_at: '2026-10-01T15:00:00.000Z', ends_at: '2026-10-01T15:45:00.000Z' }),
  lesson({ id: 'old', starts_at: '2026-10-01T05:00:00.000Z', ends_at: '2026-10-01T05:45:00.000Z' }),
];

async function open() {
  fakeNow(new Date('2026-10-01T13:10:00Z'));
  return renderWithQuery(<AdminSessionsScreen />);
}

test('the day groups its lessons: now, upcoming, ended, each with its count and the actions', async () => {
  mockApiFetch.mockResolvedValue(rows);
  await open();
  expect(await screen.findByRole('header', { name: `${t.classroom.admin.groups.now} 1` })).toBeTruthy();
  expect(screen.getByRole('header', { name: `${t.classroom.admin.groups.upcoming} 1` })).toBeTruthy();
  expect(screen.getByRole('header', { name: `${t.classroom.admin.groups.ended} 1` })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(3);
  // the ended lesson's link is past its expiry: nothing to send or copy there
  expect(screen.getAllByRole('button', { name: t.classroom.sendLink })).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: t.classroom.copyLink })).toHaveLength(2);
});

test('«التسجيلات» opens that lesson’s recordings', async () => {
  mockApiFetch.mockResolvedValue([rows[0]]);
  await open();
  await fireEvent.press(await screen.findByRole('button', { name: t.classroom.recordings.title }));
  expect(router.push).toHaveBeenCalledWith('/more/live/recordings/now');
});

test('the day switcher asks for the next day, and «اليوم» comes back', async () => {
  mockApiFetch.mockResolvedValue([]);
  await open();
  expect(await screen.findByText(t.classroom.admin.empty)).toBeTruthy();
  expect(screen.getByRole('header', { name: dayLabel('2026-10-01') })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.nextDay }));
  expect(await screen.findByRole('header', { name: dayLabel('2026-10-02') })).toBeTruthy();
  await waitFor(() => expect(mockApiFetch).toHaveBeenLastCalledWith(expect.stringContaining('date=2026-10-02')));
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.today }));
  expect(await screen.findByRole('header', { name: dayLabel('2026-10-01') })).toBeTruthy();
});

test('a failed read with nothing cached shows the error with retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await open();
  expect(await screen.findByRole('alert')).toBeTruthy();
  mockApiFetch.mockResolvedValue(rows);
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByRole('header', { name: `${t.classroom.admin.groups.now} 1` })).toBeTruthy();
});
