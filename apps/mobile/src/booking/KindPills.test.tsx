import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { KindPills } from './KindPills';

test('«نوع الحجز *» offers trial and subscription; the makeup lives on the missed lesson, and the hint says so', async () => {
  const onChange = jest.fn();
  await render(<KindPills value="package" onChange={onChange} />);
  expect(screen.getByText(`${t.booking.kind.label} *`)).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.booking.kind.package, checked: true })).toBeTruthy();
  expect(screen.getAllByRole('radio')).toHaveLength(2);
  expect(screen.queryByRole('radio', { name: t.booking.kind.makeup })).toBeNull();
  expect(screen.getByText(t.booking.mobile.makeupHint)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: t.booking.kind.trial }));
  expect(onChange).toHaveBeenCalledWith('trial');
});

test('the words are the spec’s: trial-only, subscription, makeup', () => {
  expect([t.booking.kind.trial, t.booking.kind.package, t.booking.kind.makeup]).toEqual([
    'حلقة تجريبية مجانية فقط',
    'اشتراك',
    'حجز تعويضي',
  ]);
});
