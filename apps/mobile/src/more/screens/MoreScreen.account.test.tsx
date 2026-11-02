import { avatarTone, avatarTones } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { PROFILE_KEY } from '@/account/hooks/queries';
import { t } from '@/core/lib/i18n/i18n';
import { profileFixture, savedProfile } from '@/test/account';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { MoreScreen } from './MoreScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/core/lib/session/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

const seeded = (profile = profileFixture) => {
  const client = createTestQueryClient();
  client.setQueryData(PROFILE_KEY, profile);
  return client;
};

beforeEach(() => jest.clearAllMocks());

test('R-ACC-01: «حسابي» is there for any role (no permission) and opens /more/account', async () => {
  await renderWithQuery(<MoreScreen can={() => false} />, seeded());
  await fireEvent.press(screen.getByText(t.account.nav));
  expect(router.push).toHaveBeenCalledWith('/more/account');
  expect(screen.getByText(profileFixture.full_name)).toBeTruthy();
});

test('R-ACC-05: the header shows the initials, then the photo, and opens «حسابي»', async () => {
  const { client } = await renderWithQuery(<MoreScreen />, seeded());
  expect(screen.getByTestId('avatar-initials', { includeHiddenElements: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.account.mobile.open }));
  expect(router.push).toHaveBeenCalledWith('/more/account');
  client.setQueryData(PROFILE_KEY, savedProfile({ avatar_url: 'https://cdn/a.jpg' }));
  expect((await screen.findByTestId('avatar-photo', { includeHiddenElements: true })).props.source).toEqual({ uri: 'https://cdn/a.jpg' });
});

test("the header initials' tone hashes avatar_seed (the linked teacher), so the person keeps one tone", async () => {
  await renderWithQuery(<MoreScreen />, seeded({ ...profileFixture, avatar_url: null, avatar_seed: 't1' }));
  const initials = screen.getByTestId('avatar-initials', { includeHiddenElements: true });
  const bg: unknown = StyleSheet.flatten(initials.props.style).backgroundColor;
  expect([avatarTones.light[avatarTone('t1')], avatarTones.dark[avatarTone('t1')]]).toContain(bg);
});
