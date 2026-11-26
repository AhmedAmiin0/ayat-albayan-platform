import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../../lib/i18n/i18n';
import { SlotPicker } from './SlotPicker';
import type { SlotWeek } from '../use-slot-week';

const week: SlotWeek = {
  week: '2026-11-14',
  thisWeek: '2026-11-14',
  now: new Date('2026-11-16T10:00:00Z'),
  from: '2026-11-16T10:00:00.000Z',
  to: '2026-11-20T21:00:00.000Z',
  prev: jest.fn(),
  next: jest.fn(),
  today: jest.fn(),
};
const CAIRO = { tz: 'Africa/Cairo', cycle: '24' } as const;
const TUE = '2026-11-18T14:00:00.000Z';
const WED = '2026-11-19T15:30:00.000Z';
const read = (data: { starts_at: string }[] | undefined, isError = false) => ({
  data,
  isError,
  refetch: jest.fn(),
});

test("the family's week: the first day's free starts on their clock, a pick said back", async () => {
  const onPick = jest.fn();
  const view = { week, tz: 'Africa/Cairo', viewer: CAIRO, onPick };
  const week2 = read([{ starts_at: TUE }, { starts_at: WED }]);
  await render(<SlotPicker {...view} slots={week2} value={null} />);
  expect(screen.getByText(t.schedule.zoneNote.replace('{city}', t.tz['Africa/Cairo']))).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: '16:00' }));
  expect(onPick).toHaveBeenCalledWith(TUE);
  await render(<SlotPicker {...view} slots={read([{ starts_at: TUE }])} value={TUE} />);
  expect(screen.getByText(/بتوقيتك$/)).toBeTruthy();
});

test('a failed read offers a retry; before the answer, «جارٍ التحميل»', async () => {
  const slots = read(undefined, true);
  const view = { week, tz: 'Africa/Cairo', viewer: CAIRO, value: null, onPick: jest.fn() };
  await render(<SlotPicker {...view} slots={slots} />);
  expect(screen.getByText(t.booking.slotsError)).toBeTruthy();
  await render(<SlotPicker {...view} slots={read(undefined)} />);
  expect(screen.getByText(t.common.loading)).toBeTruthy();
});

test('‹ › page the weeks; never before this one', async () => {
  const view = { week, tz: 'Africa/Cairo', viewer: CAIRO, value: null, onPick: jest.fn() };
  await render(<SlotPicker {...view} slots={read([])} />);
  expect(screen.getByText(t.reschedule.noSlots)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.nextWeek }));
  expect(week.next).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: t.schedule.prevWeek }).props.accessibilityState).toMatchObject({
    disabled: true,
  });
});
