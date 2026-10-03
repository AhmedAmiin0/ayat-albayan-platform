import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { PackageStep } from './PackageStep';
import { PAID_SIZES, REGISTRATION_SIZES } from './package-choice';

const step = () =>
  render(<PackageStep value={{ pkg: '8', durationMin: 45 }} onChange={jest.fn()} onNext={jest.fn()} />);

test('«الباقة المطلوبة *» offers the paid answers only: 4, 8, 12, 16 (the trial is «نوع الحجز»)', async () => {
  await step();
  expect(screen.getByText(`${t.booking.pickPackage} *`)).toBeTruthy();
  for (const size of PAID_SIZES) {
    expect(screen.getByRole('radio', { name: t.enums.packageSize[size] })).toBeTruthy();
  }
  for (const gone of ['trial', '20', '28'] as const) {
    expect(screen.queryByRole('radio', { name: t.enums.packageSize[gone] })).toBeNull();
  }
});

test('the options read as the form words them', () => {
  expect(REGISTRATION_SIZES.map((s) => t.enums.packageSize[s])).toEqual([
    'حلقة تجريبية مجانية بس',
    '4 حلقات في الشهر',
    '8 حلقات',
    '12 حلقة',
    '16 حلقة في الشهر',
  ]);
  expect(PAID_SIZES.map((s) => t.enums.packageSize[s])).toEqual(
    REGISTRATION_SIZES.slice(1).map((s) => t.enums.packageSize[s]),
  );
  expect(Object.values(t.enums.duration)).toEqual(['30 دقيقة', '45 دقيقة', '60 دقيقة', '90 دقيقة']);
});
