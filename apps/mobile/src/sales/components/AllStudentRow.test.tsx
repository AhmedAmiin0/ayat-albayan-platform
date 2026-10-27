import { formatPhone } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { student } from '../testing/fixtures';
import { AllStudentRow } from './AllStudentRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const S = t.sales.allStudents;
beforeEach(() => jest.mocked(router.push).mockClear());

test('the code and the guardian phone are on the row, each an LTR island', async () => {
  await render(<AllStudentRow student={student()} />);
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.getByText(ltr(formatPhone('+201001112223')))).toBeTruthy();
  expect(screen.getByText(t.sales.mobile.guardianLine.replace('{name}', 'أحمد سالم'))).toBeTruthy();
});

test('another family’s student (not mine) opens that family’s chat with the right phone', async () => {
  await render(<AllStudentRow student={student({ status: 'pending_subscription' })} />);
  const row = screen.getByRole('button');
  expect(row.props.accessibilityHint).toBe(S.chatHint);
  await fireEvent.press(row);
  expect(router.push).toHaveBeenCalledWith('/sales/inbox/thread/%2B201001112223');
});

test('one of mine opens «تفاصيل الطالب», as before', async () => {
  await render(<AllStudentRow student={student({ mine: true })} />);
  expect(screen.getByRole('button').props.accessibilityHint).toBe(S.detailsHint);
  await fireEvent.press(screen.getByRole('button'));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st1');
});

test('no saved phone: still a button, and a tap says so under the row (nothing opens)', async () => {
  await render(<AllStudentRow student={student({ guardian_phone: null })} />);
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  expect(screen.queryByText(S.noPhone)).toBeNull();
  expect(screen.getByRole('button').props.accessibilityHint).toBe(S.noPhoneHint);
  await fireEvent.press(screen.getByRole('button'));
  expect(screen.getByText(S.noPhone)).toBeTruthy();
  expect(router.push).not.toHaveBeenCalled();
  expect(announce).toHaveBeenCalledWith(S.noPhone);
});
