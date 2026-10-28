import { avatarTone, avatarTones } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { DETAIL } from '../shared/fixtures';
import { UserPhoto } from './UserPhoto';

const change = () => screen.queryByRole('button', { name: t.staffPhoto.change });

test('users.write on a staff login: «الصورة» with «تغيير الصورة» and «حذف الصورة»', async () => {
  await renderWithQuery(<UserPhoto user={{ ...DETAIL, avatar_url: 'https://cdn/u1.jpg' }} canWrite />);
  expect(change()).toBeTruthy();
  expect(screen.getByRole('button', { name: t.staffPhoto.remove })).toBeTruthy();
  expect(screen.getByTestId('avatar-photo', { includeHiddenElements: true }).props.source).toEqual({ uri: 'https://cdn/u1.jpg' });
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

test("the initials' tone hashes avatar_seed (a teacher's login = the teacher's tone)", async () => {
  await renderWithQuery(<UserPhoto user={{ ...DETAIL, avatar_url: null, avatar_seed: 't1' }} canWrite={false} />);
  const bg: unknown = StyleSheet.flatten(screen.getByTestId('avatar-initials').props.style).backgroundColor;
  expect([avatarTones.light[avatarTone('t1')], avatarTones.dark[avatarTone('t1')]]).toContain(bg);
  expect(avatarTone('t1')).not.toBe(avatarTone(DETAIL.id));
});
