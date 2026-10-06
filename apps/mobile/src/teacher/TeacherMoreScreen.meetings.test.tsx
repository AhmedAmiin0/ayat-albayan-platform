import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { TeacherMoreScreen } from './TeacherMoreScreen';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: jest.fn().mockResolvedValue({ id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] }) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

test('«اجتماعات داخلية» in the teacher’s More opens the meetings list', async () => {
  await renderWithQuery(<TeacherMoreScreen />);
  await fireEvent.press(await screen.findByText(t.mobileClassroom.meetingsRow));
  expect(router.push).toHaveBeenCalledWith('/teacher/more/meetings');
});
