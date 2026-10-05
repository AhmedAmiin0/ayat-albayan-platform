import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { MoreScreen } from '@/more/MoreScreen';
import { permissionsOf } from './use-permissions';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

test('permissionsOf reads /auth/me and drops unknown keys', () => {
  expect(permissionsOf({ role: 'admin', permissions: ['payments.read', 'nope', 3] })).toEqual(['payments.read']);
  expect(permissionsOf({ role: 'admin' })).toEqual([]);
  expect(permissionsOf(null)).toEqual([]);
});

test('«المزيد» shows only the lists the held role grants', async () => {
  await render(<MoreScreen can={(p) => p === 'pricing.read'} />);
  expect(screen.getByRole('button', { name: t.pricing.title })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.nav.teachers })).toBeNull();
  expect(screen.queryByRole('button', { name: t.nav.jobApplicants })).toBeNull();
});
