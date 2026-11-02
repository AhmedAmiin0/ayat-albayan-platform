import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { setClockPref } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { PreferenceFields } from './PreferenceFields';
import { qualForm } from '@/inbox/qualification/lib/qualification-form';

jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));
afterEach(() => setClockPref('auto'));

const from = () => within(screen.getByLabelText(t.availability.from));

test('the start-time picker shows «5:30 م» in 12 h but saves «17:30» (24 h, rule 6)', async () => {
  const onChange = jest.fn();
  await render(<PreferenceFields form={qualForm({})} errors={{}} onChange={onChange} />);
  expect(from().getByRole('radio', { name: '17:30' })).toBeTruthy();
  await act(async () => setClockPref('12'));
  expect(from().queryByRole('radio', { name: '17:30' })).toBeNull();
  await fireEvent.press(from().getByRole('radio', { name: '5:30 م' }));
  expect(onChange).toHaveBeenCalledWith({ preferred_from: '17:30' });
});
