import { screen } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { seedFullAccess } from '@/test/staff-me';
import { TeacherDetailScreen } from './TeacherDetailScreen';
import type { Teacher } from '../types';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => ({ id: 't1' }) }));

const TEACHER: Teacher = {
  id: 't1',
  display_name_ar: 'هدى سالم',
  phone_e164: null,
  status: 'active',
  tz: 'Asia/Riyadh',
  avatar_url: 'https://cdn/t1.jpg',
};

const photo = () => screen.getByTestId('avatar-photo', { includeHiddenElements: true });

beforeEach(() => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/teachers/t1') return TEACHER;
    if (path.startsWith('/teachers/t1/')) return [];
    throw new ApiError(404);
  });
});

test('an admin: the teacher’s photo with «تغيير الصورة» and «حذف الصورة»', async () => {
  await renderWithQuery(<TeacherDetailScreen />);
  expect(await screen.findByRole('button', { name: t.staffPhoto.change })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.staffPhoto.remove })).toBeTruthy();
  expect(photo().props.source).toEqual({ uri: TEACHER.avatar_url });
  expect(screen.queryByRole('image', { name: TEACHER.display_name_ar })).toBeNull(); // the header reads the name
});

test('not an admin (teachers.read on another role): the photo, no photo control', async () => {
  const client = createTestQueryClient();
  seedFullAccess(client, 'assistant');
  await renderWithQuery(<TeacherDetailScreen />, client);
  expect(await screen.findByTestId('avatar-photo', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.queryByRole('image', { name: TEACHER.display_name_ar })).toBeNull();
  expect(screen.queryByRole('button', { name: t.staffPhoto.change })).toBeNull();
  expect(screen.queryByRole('button', { name: t.staffPhoto.remove })).toBeNull();
});
