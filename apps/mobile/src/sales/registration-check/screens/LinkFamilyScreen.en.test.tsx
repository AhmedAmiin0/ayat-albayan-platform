import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { LinkFamilyScreen } from './LinkFamilyScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async (path: string) =>
    path === '/auth/me'
      ? { role: 'admin', permissions: ['students.check_registration', 'leads.link_family'] }
      : { found: true, more: false, matches: [{ name: 'Reem', code: 'AB-0201', status: 'active', teacher_name: null }] },
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223', leadId: 'lead-1' }),
}));

test('an English run: the link-family screen reads en.json', async () => {
  expect(t).toEqual(en);
  await renderWithQuery(<LinkFamilyScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByRole('header', { name: en.inbox.linkFamily.title })).toBeTruthy();
  const field = await screen.findByLabelText(en.registrationCheck.query);
  expect(screen.getByText(en.inbox.linkFamily.hint)).toBeTruthy();
  await fireEvent.changeText(field, 'Reem');
  await fireEvent(field, 'submitEditing');
  await fireEvent.press(await screen.findByText('Reem'));
  expect(screen.getByRole('button', { name: en.inbox.linkFamily.submit })).toBeTruthy();
});
