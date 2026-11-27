import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { student } from '@/portal/portal.fixtures';
import { FamilyHeader } from './FamilyHeader';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20, unread: 0 })),
}));

const show = (node: React.ReactElement) => renderWithQuery(node, freshQueryClient());
const switchName = (name: string) => t.portal.app.pick.open.replace('{name}', name);

beforeEach(() => jest.clearAllMocks());

test('a pushed screen: its title and subtitle, back goes back, no bell', async () => {
  await show(<FamilyHeader title="سارة" subtitle="AB-0001" back />);
  expect(screen.getByText('سارة')).toBeTruthy();
  expect(screen.getByText('AB-0001')).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.bell.open })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

test('a tab screen: the bell opens the alerts, no switch without a child', async () => {
  const kid = student();
  await show(<FamilyHeader title="التقارير" />);
  await fireEvent.press(await screen.findByRole('button', { name: t.bell.open }));
  expect(router.push).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: switchName(kid.name) })).toBeNull();
});

test('a tab of a guardian of several: the child in view under the title', async () => {
  const kid = student();
  await show(<FamilyHeader title="التقارير" child={kid} />);
  expect(screen.getByRole('button', { name: switchName(kid.name) })).toBeTruthy();
});
