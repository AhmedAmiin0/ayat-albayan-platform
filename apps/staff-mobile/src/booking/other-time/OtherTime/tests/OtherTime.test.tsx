import { setViewerPersonTz } from '@ab/client-core';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { FIVE_PM, LATE, NOON, OUTSIDE_LIST, TEACHER_ID } from '@/booking/other-time/OtherTime.fixture';
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
const time = (name: string | RegExp) => screen.findByRole('radio', { name });

beforeEach(() => {
  jest.clearAllMocks();
  setViewerPersonTz('Asia/Riyadh');
  mockApiFetch.mockResolvedValue(OUTSIDE_LIST);
});
afterAll(() => setViewerPersonTz(null));

test('nothing is read until «وقت آخر»; then only the server list, with no device time in the query', async () => {
  await renderWithQuery(
    <OtherTime teacherId={TEACHER_ID} tz="Asia/Riyadh" durationMin={45} onPick={onPick} />,
  );
  expect(mockApiFetch).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.otherTime }));
  expect(await time('12:00')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(
    `/booking/outside-slots?teacherId=${TEACHER_ID}&durationMin=45`,
  );
});

test('an outside time warns before it is picked; «التالي» sends it with outside = true', async () => {
  await open();
  await fireEvent.press(await time('12:00'));
  expect(screen.getByText(t.booking.outsideHours)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  expect(onPick).toHaveBeenCalledWith(NOON, true);
});

test('an inside time has no warning and goes with outside = false', async () => {
  await open();
  await fireEvent.press(await time('17:00'));
  expect(screen.queryByText(t.booking.outsideHours)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  expect(onPick).toHaveBeenCalledWith(FIVE_PM, false);
});

test('days group by the viewer zone: Riyadh puts 00:30 on Wednesday, Cairo keeps 23:30 on Tuesday', async () => {
  await open();
  expect(await time('12:00')).toBeTruthy();
  expect(screen.queryByRole('radio', { name: '00:30' })).toBeNull();
  const days = screen
    .getAllByRole('radio')
    .filter((r) => !/^\d\d:\d\d/.test(String(r.props.accessibilityLabel)));
  expect(days).toHaveLength(2);
  const wednesday = days[1];
  if (!wednesday) throw new Error('no second day');
  await fireEvent.press(wednesday);
  await fireEvent.press(await time('00:30'));
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  expect(onPick).toHaveBeenCalledWith(LATE, true);
});

test('a Cairo viewer sees one day, each time with the family Riyadh clock beside it', async () => {
  setViewerPersonTz('Africa/Cairo');
  await open();
  expect(await time(/^11:00/)).toBeTruthy();
  expect(await time(/^23:30/)).toBeTruthy();
  expect(screen.getByText(/12:00/)).toBeTruthy();
});
