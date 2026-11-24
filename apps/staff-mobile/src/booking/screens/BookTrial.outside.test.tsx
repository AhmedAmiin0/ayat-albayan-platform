import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { NOON, OUTSIDE_LIST } from '@/booking/other-time/OtherTime.fixture';
import { booked, maryam } from '@/booking/testing/fixtures';
import { fakeBookingApi, seededClient, walkToConfirm } from '@/booking/testing/test-utils';
import { BookTrialScreen } from './BookTrialScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ leadId: 'a1' }),
}));

const sent = (n: number) => mockApiSend.mock.calls[n]?.[2] as Record<string, unknown>;

async function walkOutside() {
  await fireEvent.changeText(await screen.findByLabelText(t.leads.studentName), 'يوسف');
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.otherTime }));
  await fireEvent.press(await screen.findByRole('radio', { name: '12:00' }));
  expect(screen.getByText(t.booking.outsideHours)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  await screen.findByRole('button', { name: t.booking.submit });
}

beforeEach(() => {
  jest.clearAllMocks();
  const fake = fakeBookingApi();
  mockApiFetch.mockImplementation((path: string) =>
    path.startsWith('/booking/outside-slots') ? Promise.resolve(OUTSIDE_LIST) : fake.fetch(path),
  );
});

test('«وقت آخر»: the review warns, and the booking carries outsideHours with the server instant', async () => {
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await walkOutside();
  expect(screen.getByText(t.booking.outsideHours)).toBeTruthy();
  mockApiSend.mockResolvedValueOnce(booked(NOON));
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(sent(0)).toMatchObject({
    outsideHours: true,
    startsAt: NOON,
    startTimeLocal: '12:00',
    tz: 'Asia/Riyadh',
  });
});

test('a clash with the flag is still shown as a clash', async () => {
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await walkOutside();
  const conflicts = [{ kind: 'teacher_busy', startsAt: NOON, endsAt: '2026-12-01T09:45:00.000Z' }];
  mockApiSend.mockRejectedValueOnce(
    new ApiError(409, { code: 'conflict', message: 'conflict', conflicts }),
  );
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
});

test('a normal free time: no warning, no flag (old behaviour)', async () => {
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await walkToConfirm();
  expect(screen.queryByText(t.booking.outsideHours)).toBeNull();
  mockApiSend.mockResolvedValueOnce(booked(NOON));
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(sent(0)).not.toHaveProperty('outsideHours');
});
