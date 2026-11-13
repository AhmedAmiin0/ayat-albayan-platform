import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery, teacherPagesClient } from '@/test/query';
import { TeacherMoreScreen } from './TeacherMoreScreen';

jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: jest.fn(jest.requireActual('@/test/account').fetchWithProfile({ id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] })) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/core/lib/session/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

const GATED = [
  t.teacherNav.messages, t.teacherNav.payouts, t.teacherNav.statements, t.mobile.feedback.title,
  t.mobileClassroom.meetingsRow,
];

test('«مستحقاتي» opens the per-lesson earnings (the monthly statements are inside it)', async () => {
  await renderWithQuery(<TeacherMoreScreen />, teacherPagesClient());
  await fireEvent.press(await screen.findByText(t.teacherNav.payouts));
  expect(router.push).toHaveBeenCalledWith('/teacher/more/earnings');
  expect(screen.queryByText(t.teacherNav.statements)).toBeNull();
});

test('every switch off (the default): only students and availability stay', async () => {
  await renderWithQuery(<TeacherMoreScreen />, teacherPagesClient(false));
  expect(await screen.findByText(t.teacherNav.students)).toBeTruthy();
  expect(screen.getByText(t.availability.title)).toBeTruthy();
  for (const title of GATED) expect(screen.queryByText(title)).toBeNull();
});

test('«أرباحي» off, «كشوف الشهر» on: a direct row to the statements', async () => {
  await renderWithQuery(<TeacherMoreScreen />, teacherPagesClient(false, { teacher_statements_enabled: true }));
  await fireEvent.press(await screen.findByText(t.teacherNav.statements));
  expect(router.push).toHaveBeenCalledWith('/teacher/more/payouts');
  expect(screen.queryByText(t.teacherNav.payouts)).toBeNull();
});

test('one meetings switch is enough for the meetings row', async () => {
  await renderWithQuery(<TeacherMoreScreen />, teacherPagesClient(false, { teacher_scheduled_meetings_enabled: true }));
  expect(await screen.findByText(t.mobileClassroom.meetingsRow)).toBeTruthy();
});
