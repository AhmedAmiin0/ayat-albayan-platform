import { setViewerPersonTz } from '@ab/client-core';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { NOON, OUTSIDE_LIST, TEACHER_ID } from '@/booking/other-time/OtherTime.fixture';
import { OtherTime } from '@/booking/other-time/OtherTime/OtherTime';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const onPick = jest.fn();
const open = async () => {
  await renderWithQuery(
    <OtherTime teacherId={TEACHER_ID} tz="Asia/Riyadh" durationMin={45} onPick={onPick} />,
  );
  await fireEvent.press(screen.getByRole('button', { name: t.booking.otherTime }));
};
/** Only Date is faked: timers and promises run as usual. */
const fakeDeviceClock = (iso: string) =>
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
      'clearImmediate',
      'queueMicrotask',
      'hrtime',
      'performance',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
    ],
  });

beforeEach(() => {
  jest.clearAllMocks();
  setViewerPersonTz('Asia/Riyadh');
});
afterEach(() => jest.useRealTimers());
afterAll(() => setViewerPersonTz(null));

test('a failed read offers a retry that asks again', async () => {
  mockApiFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(OUTSIDE_LIST);
  await open();
  await fireEvent.press(await screen.findByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByRole('radio', { name: '12:00' })).toBeTruthy();
});

test('an answer that breaks the shared schema (a free-text time) is an error, never shown', async () => {
  mockApiFetch.mockResolvedValue({
    ...OUTSIDE_LIST,
    slots: [{ starts_at: 'noon', ends_at: 'x', inside_hours: false }],
  });
  await open();
  expect(await screen.findByText(t.booking.slotsError)).toBeTruthy();
  expect(screen.queryByRole('radio')).toBeNull();
});

test('an empty fortnight says so; «إخفاء» closes the list', async () => {
  mockApiFetch.mockResolvedValue({ ...OUTSIDE_LIST, slots: [] });
  await open();
  expect(await screen.findByText(t.booking.otherTimeEmpty)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.otherTimeHide }));
  expect(screen.queryByText(t.booking.otherTimeEmpty)).toBeNull();
});

test.each(['2026-12-04T13:00:00Z', '2026-11-30T03:00:00Z'])(
  'a phone clock off (%s) changes nothing: same request, same times, same pick',
  async (device) => {
    fakeDeviceClock(device);
    mockApiFetch.mockResolvedValue(OUTSIDE_LIST);
    await open();
    expect(await screen.findByRole('radio', { name: '12:00' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '17:00' })).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/booking/outside-slots?teacherId=${TEACHER_ID}&durationMin=45`,
    );
    await fireEvent.press(screen.getByRole('radio', { name: '12:00' }));
    await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
    expect(onPick).toHaveBeenCalledWith(NOON, true);
  },
);
