import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { AdminOpsSection } from './AdminOpsSection';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('«الإدارة» lists the three screens and each opens its route', async () => {
  await render(<AdminOpsSection />);
  expect(screen.getByRole('header', { name: t.mobileAdmin.section })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileAdmin.rows.dashboard }));
  expect(router.push).toHaveBeenCalledWith('/more/ops/dashboard');
  await fireEvent.press(screen.getByRole('button', { name: t.mobileAdmin.rows.settings }));
  expect(router.push).toHaveBeenCalledWith('/more/ops/settings');
  await fireEvent.press(screen.getByRole('button', { name: t.mobileAdmin.rows.activity }));
  expect(router.push).toHaveBeenCalledWith('/more/ops/activity');
});
