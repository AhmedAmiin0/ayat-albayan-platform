import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { KindPills } from './KindPills';

test('«نوع الحجز *» shows the three answers; «حجز تعويضي» is disabled on a lead, with the hint', async () => {
  const onChange = jest.fn();
  await render(<KindPills value="package" onChange={onChange} />);
  expect(screen.getByText(`${t.booking.kind.label} *`)).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.booking.kind.package, checked: true })).toBeTruthy();
  const makeup = screen.getByRole('radio', { name: t.booking.kind.makeup });
  expect(makeup.props.accessibilityState).toMatchObject({ checked: false, disabled: true });
  expect(screen.getByText(t.booking.mobile.makeupHint)).toBeTruthy();
  await fireEvent.press(makeup);
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('radio', { name: t.booking.kind.trial }));
  expect(onChange).toHaveBeenCalledWith('trial');
});

test('the words are the spec’s: trial-only, subscription, makeup', () => {
  expect([t.booking.kind.trial, t.booking.kind.package, t.booking.kind.makeup]).toEqual([
    'حلقة تجريبية مجانية بس',
    'اشتراك',
    'حجز تعويضي',
  ]);
});
