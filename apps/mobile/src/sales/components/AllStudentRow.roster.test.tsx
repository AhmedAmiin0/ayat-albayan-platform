import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { student } from '@/sales/testing/fixtures';
import { AllStudentRow } from './AllStudentRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => false }));

const S = t.sales.allStudents;
const asma = { display_name_ar: 'أسماء حسين', display_name_en: null };
const weekly = [{ next: ['2026-11-01T08:00:00.000Z', '2026-11-03T08:00:00.000Z', '2026-11-05T08:00:00.000Z'], teacher: asma }];

// Owner 2026-10-30: every student's schedule and attendance on the row, hers or another family's.
test.each([
  ['another assistant\'s student', student({ weekly, attendance: { attended: 7, held: 9, basis: 'subscription' } })],
  ['one of mine', student({ mine: true, weekly, attendance: { attended: 7, held: 9, basis: 'subscription' } })],
])('%s: the weekly line in Riyadh and «حضر 7 من 9»', async (_, row) => {
  await render(<TreeBaseProvider value="/sales"><AllStudentRow student={row} /></TreeBaseProvider>);
  expect(screen.getByText('الأحد، الثلاثاء، الخميس · 11:00 ص · أسماء حسين')).toBeTruthy();
  expect(screen.getByText('حضر 7 من 9 في الباقة الحالية')).toBeTruthy();
  expect(screen.getByText('يوسف أحمد')).toBeTruthy();
});

test('no fixed schedule and no lesson in the last 30 days', async () => {
  await render(<AllStudentRow student={student({ weekly: [], attendance: { attended: 0, held: 0, basis: 'recent' } })} />);
  expect(screen.getByText(S.noSchedule)).toBeTruthy();
  expect(screen.getByText(S.noHeldRecent)).toBeTruthy();
});

test('an old cache without the fields: the row as before, no extra lines', async () => {
  await render(<AllStudentRow student={student()} />);
  expect(screen.queryByTestId('roster-lines')).toBeNull();
  expect(screen.queryByText(S.noSchedule)).toBeNull();
});
