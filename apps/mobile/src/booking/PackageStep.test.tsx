import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { PackageStep } from './PackageStep';
import { REGISTRATION_SIZES } from './package-choice';

const step = () =>
  render(<PackageStep value={{ pkg: '8', durationMin: 45 }} onChange={jest.fn()} onNext={jest.fn()} />);

test('«الباقة المطلوبة *» offers the form’s five answers only: no 20 or 28', async () => {
  await step();
  expect(screen.getByText(`${t.booking.pickPackage} *`)).toBeTruthy();
  for (const size of REGISTRATION_SIZES) {
    expect(screen.getByRole('radio', { name: t.enums.packageSize[size] })).toBeTruthy();
  }
  expect(screen.queryByRole('radio', { name: t.enums.packageSize['20'] })).toBeNull();
  expect(screen.queryByRole('radio', { name: t.enums.packageSize['28'] })).toBeNull();
});

test('the options read as the form words them', () => {
  expect(REGISTRATION_SIZES.map((s) => t.enums.packageSize[s])).toEqual([
    'حلقة تجريبية مجانية بس',
    '4 حلقات في الشهر',
    '8 حلقات',
    '12 حلقة',
    '16 حلقة في الشهر',
  ]);
  expect(Object.values(t.enums.duration)).toEqual(['30 دقيقة', '45 دقيقة', '60 دقيقة', '90 دقيقة']);
});
