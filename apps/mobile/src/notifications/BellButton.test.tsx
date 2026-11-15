import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { BellButton } from './BellButton';

// The bell itself (badge, spoken name) is the kit's (mobile-kit notifications/BellButton.test).
const mockPage = { items: [], total: 0, page: 1, pageSize: 20, unread: 0 };
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async () => mockPage),
}));

test.each([
  ['admin', '/more/notifications'],
  ['teacher', '/teacher/today/notifications'],
] as const)('in the %s tree it opens %s', async (tree, href) => {
  await renderWithQuery(<BellButton tree={tree} />);
  await fireEvent.press(await screen.findByRole('button', { name: t.bell.mobile.open }));
  expect(router.push).toHaveBeenCalledWith(href);
});
