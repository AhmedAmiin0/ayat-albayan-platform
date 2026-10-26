import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { renderWithQuery } from '@/test/query';
import { SARA, usersGet } from '../shared/fixtures';
import { UsersScreen } from './UsersScreen';

// The users list shows a teacher's sign-in username (docs/30 §7).

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));

test('a row shows the username, a row without one shows none', async () => {
  const omar = { ...SARA, id: 'u3', full_name: 'أ. عمر', role: 'teacher' as const, username: 'ustadh.omar' };
  mockApiFetch.mockImplementation(usersGet({ items: [omar, { ...SARA, username: null }] }));
  await renderWithQuery(<UsersScreen can={() => true} />);
  expect(await screen.findByText(`${t.familyAuth.usersColumn}: ${ltr('ustadh.omar')}`)).toBeTruthy();
  expect(screen.getAllByText(new RegExp(`^${t.familyAuth.usersColumn}:`))).toHaveLength(1);
});
