import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { TeacherMoreScreen } from './TeacherMoreScreen';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: jest.fn(jest.requireActual('@/test/account').fetchWithProfile({ id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] })) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

test('«مستحقاتي» opens the per-lesson earnings (the monthly statements are inside it)', async () => {
  await renderWithQuery(<TeacherMoreScreen />);
  await fireEvent.press(await screen.findByText(t.teacherNav.payouts));
  expect(router.push).toHaveBeenCalledWith('/teacher/more/earnings');
});
