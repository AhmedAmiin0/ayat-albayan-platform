import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { maryam, slot, SUN_17, TUE_17 } from './fixtures';
import { SlotStep } from './SlotStep';
import { fakeBookingApi } from './test-utils';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

/** Sunday 4 Oct 2026, 19:00 Riyadh: another time on Sunday. */
const SUN_19 = '2026-10-04T16:00:00.000Z';
const onNext = jest.fn();
const seen: string[][] = [];

function Harness({ need }: { need?: number }) {
  const [picks, setPicks] = useState<string[]>([]);
  return (
    <SlotStep
      teacherId={maryam.id}
      tz="Asia/Riyadh"
      durationMin={45}
      multi={{
        picks,
        onChange: (next) => {
          seen.push(next);
          setPicks(next);
        },
        onNext,
        ...(need ? { need } : {}),
      }}
    />
  );
}

const box = (name: string) => screen.findByRole('checkbox', { name });
const nextDisabled = () =>
  screen.getByRole('button', { name: t.booking.next }).props.accessibilityState?.disabled === true;

beforeEach(() => {
  jest.clearAllMocks();
  seen.length = 0;
  const api = fakeBookingApi();
  api.api.slots = [slot(SUN_17), slot(SUN_19), slot(TUE_17)];
  mockApiFetch.mockImplementation(api.fetch);
});

test('toggles one time per family-tz weekday: another time that day replaces it, the same one removes it', async () => {
  await renderWithQuery(<Harness />);
  expect(screen.getByText(t.booking.pickDayTimes, { exact: false })).toBeTruthy();
  expect(nextDisabled()).toBe(true);
  const [sun17] = await screen.findAllByRole('checkbox', { name: '17:00' });
  if (!sun17) throw new Error('no Sunday 17:00');
  await fireEvent.press(sun17);
  await fireEvent.press(await box('19:00'));
  expect(seen.at(-1)).toEqual([SUN_19]); // Sunday 19:00 replaced Sunday 17:00
  const tue = screen.getAllByRole('checkbox', { name: '17:00' })[1];
  if (!tue) throw new Error('no Tuesday 17:00');
  await fireEvent.press(tue);
  expect(seen.at(-1)).toEqual([SUN_19, TUE_17]);
  expect(screen.getByRole('checkbox', { name: '19:00', checked: true })).toBeTruthy();
  await fireEvent.press(await box('19:00'));
  expect(seen.at(-1)).toEqual([TUE_17]);
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  expect(onNext).toHaveBeenCalledTimes(1);
});

test('«احذف الأحد» unpicks a day from the list', async () => {
  await renderWithQuery(<Harness />);
  await fireEvent.press(await box('19:00'));
  await fireEvent.press(screen.getByRole('button', { name: t.booking.removeDay.replace('{day}', t.enums.weekday['0']) }));
  expect(seen.at(-1)).toEqual([]);
  expect(screen.getByText(t.booking.noDayPicked)).toBeTruthy();
});

test('a course needs exactly n days: «التالي» waits for them', async () => {
  await renderWithQuery(<Harness need={2} />);
  expect(screen.getByText(t.booking.pickNDays.two)).toBeTruthy();
  await fireEvent.press(await box('19:00'));
  expect(nextDisabled()).toBe(true);
  const tue = screen.getAllByRole('checkbox', { name: '17:00' })[1];
  if (!tue) throw new Error('no Tuesday 17:00');
  await fireEvent.press(tue);
  expect(nextDisabled()).toBe(false);
});
