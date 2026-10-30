import { formatPhone } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { ltr } from '@/core/ui/primitives/Ltr';
import { student } from '../testing/fixtures';
import { AllStudentRow } from './AllStudentRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const S = t.sales.allStudents;
// The sales tree (SalesTabs wraps its screens in TreeBaseProvider '/sales').
const inSales = (node: ReactElement) => render(<TreeBaseProvider value="/sales">{node}</TreeBaseProvider>);
beforeEach(() => jest.mocked(router.push).mockClear());

test('the code and the guardian phone are on the row, each an LTR island', async () => {
  await inSales(<AllStudentRow student={student()} />);
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.getByText(ltr(formatPhone('+201001112223')))).toBeTruthy();
  expect(screen.getByText(t.sales.mobile.guardianLine.replace('{name}', 'أحمد سالم'))).toBeTruthy();
});

test.each([
  ['another family’s student (not mine)', student({ status: 'pending_subscription' })],
  ['one of mine', student({ mine: true })],
  ['a student with no saved phone', student({ guardian_phone: null })],
])('the sales tree (owner 2026-10-28): %s opens «تفاصيل الطالب»', async (_, row) => {
  await inSales(<AllStudentRow student={row} />);
  expect(screen.getByRole('button').props.accessibilityHint).toBe(S.detailsHint);
  await fireEvent.press(screen.getByRole('button'));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st1');
});

test.each([
  ['one of mine', student({ mine: true })],
  ['a student with no saved phone', student({ guardian_phone: null })],
])('the admin tree (double role, «المزيد» › «المبيعات»): %s opens the admin\'s student file, never the chat', async (_, row) => {
  await render(<AllStudentRow student={row} />);
  expect(screen.getByRole('button').props.accessibilityHint).toBe(S.detailsHint);
  await fireEvent.press(screen.getByRole('button'));
  expect(router.push).toHaveBeenCalledTimes(1);
  expect(router.push).toHaveBeenCalledWith('/students/st1');
});
