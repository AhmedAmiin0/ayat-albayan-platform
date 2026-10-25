import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { PROFILE_KEY } from '@/account/queries';
import { t } from '@/core/lib/i18n/i18n';
import { profileFixture } from '@/test/account';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { signOutDevice } from '@/more/sign-out';
import { AssistantMoreScreen } from './AssistantMoreScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

const seeded = () => {
  const client = createTestQueryClient();
  client.setQueryData(PROFILE_KEY, profileFixture);
  return client;
};

test('the assistant «المزيد»: role line, appearance, language, sign-out', async () => {
  await renderWithQuery(<AssistantMoreScreen />, seeded());
  expect(screen.getByRole('header', { name: t.mobile.more })).toBeTruthy();
  expect(screen.getByText(t.mobileRoles.assistantRole)).toBeTruthy();
  expect(screen.getByRole('header', { name: t.language.label })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  expect(signOutDevice).toHaveBeenCalled();
});

test('R-ACC-01: «حسابي» opens inside the assistant tree', async () => {
  await renderWithQuery(<AssistantMoreScreen />, seeded());
  await fireEvent.press(screen.getByText(t.account.nav));
  expect(router.push).toHaveBeenCalledWith('/assistant/more/account');
});
