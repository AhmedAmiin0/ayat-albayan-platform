import type { SalesPackageSummary } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { student } from '@/sales/testing/fixtures';
import { AllStudentRow } from './AllStudentRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => false }));

const S = t.sales.allStudents;
const summary: SalesPackageSummary = {
  id: 'sub9', package: '8', status: 'active', starts_on: '2026-10-01', renews_on: null, ended_at: null,
  projected_end_at: null, created_at: '2026-09-30T10:00:00.000Z', lessons_total: 8, lessons_used: 3, lessons_remaining: 5,
};

// Owner 2026-10-30: every student's status and current package on the row, hers or not; no price.
test.each([
  ['another assistant\'s student', student({ package: summary })],
  ['one of mine', student({ mine: true, package: summary })],
])('%s: the status chip and «الباقة: …» with used / left and the start', async (_, row) => {
  await render(<AllStudentRow student={row} />);
  expect(screen.getByText(t.enums.studentStatus.active)).toBeTruthy();
  const line = [
    `${t.enums.packageSize['8']} · ${t.enums.subscriptionStatus.active}`,
    'استُخدمت 3 من 8',
    'المتبقي: 5',
    `البدء: ${ltr('2026-10-01')}`,
  ].join(' · ');
  expect(screen.getByText(S.packageLine.replace('{line}', line))).toBeTruthy();
});

test('no current package: «لا توجد باقة حالية»; an old cache: no package line', async () => {
  const view = await render(<AllStudentRow student={student({ package: null })} />);
  expect(screen.getByText(S.noPackage)).toBeTruthy();
  await view.unmount();
  await render(<AllStudentRow student={student()} />);
  expect(screen.queryByText(S.noPackage)).toBeNull();
});
