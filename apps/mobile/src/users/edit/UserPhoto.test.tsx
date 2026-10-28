import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { DETAIL } from '../shared/fixtures';
import { UserPhoto } from './UserPhoto';

const change = () => screen.queryByRole('button', { name: t.staffPhoto.change });

test('users.write on a staff login: «الصورة» with «تغيير الصورة» and «حذف الصورة»', async () => {
  await renderWithQuery(<UserPhoto user={{ ...DETAIL, avatar_url: 'https://cdn/u1.jpg' }} canWrite />);
  expect(change()).toBeTruthy();
  expect(screen.getByRole('button', { name: t.staffPhoto.remove })).toBeTruthy();
  expect(screen.getByRole('image', { name: DETAIL.full_name }).props.source).toEqual({ uri: 'https://cdn/u1.jpg' });
});

test.each(['student', 'guardian'] as const)('a %s login: initials only, no photo control', async (role) => {
  await renderWithQuery(<UserPhoto user={{ ...DETAIL, role }} canWrite />);
  expect(change()).toBeNull();
  expect(screen.getByTestId('avatar-initials')).toBeTruthy();
});

test('without users.write: the photo alone', async () => {
  await renderWithQuery(<UserPhoto user={{ ...DETAIL, avatar_url: 'https://cdn/u1.jpg' }} canWrite={false} />);
  expect(change()).toBeNull();
  expect(screen.getByTestId('avatar-photo')).toBeTruthy();
});
