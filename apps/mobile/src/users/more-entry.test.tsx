import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { MoreScreen } from '@/more/MoreScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

const only = (...keys: string[]) => (p: string) => keys.includes(p);

test('«المستخدمون» is in «المزيد» with users.read and opens the list', async () => {
  await render(<MoreScreen can={only('users.read')} />);
  await fireEvent.press(screen.getByRole('button', { name: t.users.nav }));
  expect(router.push).toHaveBeenCalledWith('/more/users');
});

test('without users.read there is no «المستخدمون»', async () => {
  await render(<MoreScreen can={only('students.read', 'users.write')} />);
  expect(screen.queryByRole('button', { name: t.users.nav })).toBeNull();
});
