import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { BookTrialScreen } from './BookTrialScreen';
import { booked, MON_19, slot, SUN_17 } from './fixtures';
import { whenText } from './slots';
import { fakeBookingApi, seededClient, walkToConfirm } from './test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ leadId: 'a1' }),
}));

const clash = new ApiError(409, {
  code: 'conflict',
  message: 'conflict',
  conflicts: [{ kind: 'teacher_busy', startsAt: SUN_17, endsAt: '2026-10-04T14:45:00.000Z' }],
});
const sent = (n: number) =>
  mockApiSend.mock.calls[n]?.[2] as { clientRequestId: string; startsAt: string };
const slotCalls = () =>
  mockApiFetch.mock.calls.filter((c: unknown[]) => String(c[0]).startsWith('/booking/slots'))
    .length;

beforeEach(() => jest.clearAllMocks());

test('409 conflict: the Arabic clash lines, «اختر موعدًا آخر» → fresh slots → same request id', async () => {
  const fake = fakeBookingApi();
  mockApiFetch.mockImplementation(fake.fetch);
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await walkToConfirm();

  mockApiSend.mockRejectedValueOnce(clash).mockResolvedValueOnce(booked(MON_19));
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
  expect(
    screen.getByText('المعلم/ة مشغول/ة بحلقة أخرى في هذا الموعد (الأحد 4 أكتوبر 17:00)'),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.booking.submit })).toBeNull();

  // Meanwhile Sunday went and Monday opened up.
  fake.api.slots = [slot(SUN_17, true), slot(MON_19)];
  const before = slotCalls();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.changeSlot }));
  await fireEvent.press(await screen.findByRole('button', { name: '19:00' }));
  expect(slotCalls()).toBeGreaterThan(before);
  expect(screen.queryByText(t.booking.conflictTitle)).toBeNull();
  expect(screen.getByText(whenText(MON_19, 'Asia/Riyadh'))).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledTimes(2);
  expect(sent(1).startsAt).toBe(MON_19);
  expect(sent(1).clientRequestId).toBe(sent(0).clientRequestId);
});

test('offline: says the booking may or may not exist; «احجز» again re-sends the same id', async () => {
  mockApiFetch.mockImplementation(fakeBookingApi().fetch);
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await walkToConfirm();

  mockApiSend
    .mockRejectedValueOnce(new TypeError('Network request failed'))
    .mockResolvedValueOnce(booked(SUN_17));
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.mobile.offline)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(sent(1).clientRequestId).toBe(sent(0).clientRequestId);
});

test('a teacher with no free slot this week says so', async () => {
  const fake = fakeBookingApi();
  fake.api.slots = [slot(SUN_17, true)];
  mockApiFetch.mockImplementation(fake.fetch);
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentName), 'يوسف');
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  await fireEvent.press(await screen.findByText('مريم المعلمة'));
  expect(await screen.findByText(t.booking.mobile.noSlots)).toBeTruthy();
});
