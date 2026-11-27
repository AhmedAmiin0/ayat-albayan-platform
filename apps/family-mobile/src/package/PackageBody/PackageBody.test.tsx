import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { student } from '@/portal/portal.fixtures';
import { PackageBody } from './PackageBody';

let mockView: unknown = null;
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async () => mockView),
}));

const kid = student();
const P = t.portal.app.package;
const pkg = {
  package: '8',
  duration: 30,
  lessons_total: 8,
  lessons_used: 3,
  remaining: 5,
  starts_on: '2026-11-01',
  renews_on: '2026-12-01',
  status: 'active',
  amount_due: { amount: 200, currency: 'SAR' },
};
const show = () => renderWithQuery(<PackageBody student={kid} />, freshQueryClient());

test('the package, what is owed, how to pay, and each payment and refund', async () => {
  mockView = {
    package: pkg,
    payments: [
      { paid_at: '2026-11-02T10:00:00Z', amount: 400, currency: 'SAR', kind: 'payment' },
      { paid_at: '2026-11-03T10:00:00Z', amount: 50, currency: 'SAR', kind: 'refund' },
    ],
    payment_instructions: 'transfer to the academy',
  };
  await show();
  expect(await screen.findByText(P.title.replace('{n}', '8'))).toBeTruthy();
  expect(screen.getByText(P.perLesson.replace('{n}', '30'))).toBeTruthy();
  expect(screen.getByText(t.portal.packageStatus.active)).toBeTruthy();
  expect(screen.getByText(P.usedOf.replace('{used}', '3').replace('{total}', '8'))).toBeTruthy();
  expect(screen.getByText(P.renewal)).toBeTruthy();
  expect(screen.getByText(t.portal.amountDue)).toBeTruthy();
  expect(screen.getByText('transfer to the academy')).toBeTruthy();
  expect(screen.getByText(P.afterTransfer)).toBeTruthy();
  expect(screen.getByText(t.portal.payments)).toBeTruthy();
  expect(screen.getByText(P.paid)).toBeTruthy();
  expect(screen.getByText(P.refund)).toBeTruthy();
});

test('no package, nothing owed, no renewal date, no transfer text and no payments', async () => {
  mockView = { package: null, payments: [], payment_instructions: '' };
  await show();
  expect(await screen.findByText(t.portal.packageEmpty)).toBeTruthy();
  expect(screen.queryByText(t.portal.paymentInstructions)).toBeNull();
  expect(screen.queryByText(t.portal.payments)).toBeNull();
});

test('a package with no renewal date, nothing owed and no lessons yet', async () => {
  mockView = {
    package: { ...pkg, lessons_total: 0, lessons_used: 0, renews_on: null, amount_due: null },
    payments: [],
    payment_instructions: '',
  };
  await show();
  expect(await screen.findByText(P.start)).toBeTruthy();
  expect(screen.queryByText(P.renewal)).toBeNull();
  expect(screen.queryByText(t.portal.amountDue)).toBeNull();
});
