import { act, render, screen } from '@testing-library/react-native';
import { setClockPref } from '@/core/lib/clock';
import { WeekdayRow } from './WeekdayRow';

jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));
afterEach(() => setClockPref('auto'));

const day = { weekday: 1, slots: [{ id: 's1', weekday: 1, start_time: '16:00', end_time: '18:30', tz: 'Asia/Riyadh' }] };

test('«المزيد › مواعيدي»: 24 h on a 24 h phone, then 12 h with ص/م the moment the setting changes', async () => {
  await render(<WeekdayRow day={day} />);
  expect(screen.getByText('⁦16:00 – 18:30⁩')).toBeTruthy();
  await act(async () => setClockPref('12'));
  // Arabic 12 h reads right to left, so the range is an RTL island: «4:00 م – 6:30 م».
  expect(screen.getByText('⁧4:00 م – 6:30 م⁩')).toBeTruthy();
});
