import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { PROFILE_KEY } from '@/account/queries';
import { t } from '@/core/lib/i18n/i18n';
import { profileFixture, savedProfile } from '@/test/account';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { MoreScreen } from './MoreScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('./sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

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
  expect(screen.getByTestId('profile-avatar-initials', { includeHiddenElements: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.account.mobile.open }));
  expect(router.push).toHaveBeenCalledWith('/more/account');
  client.setQueryData(PROFILE_KEY, savedProfile({ avatar_url: 'https://cdn/a.jpg' }));
  expect((await screen.findByTestId('profile-avatar-photo')).props.source).toEqual({ uri: 'https://cdn/a.jpg' });
});
