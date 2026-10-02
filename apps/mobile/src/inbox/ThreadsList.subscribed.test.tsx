import type { ThreadView } from '@ab/shared';
import { screen, within } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { InboxScreen } from './InboxScreen';
import { thread } from './thread-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const subscribed: ThreadView = {
  ...thread,
  phone_e164: '+966552147731',
  display_name: 'أم يوسف',
  guardian_id: 'g-1',
  lead_status: null,
  subscribed: true,
};

test('a subscribed family’s row says «مشترك» beside its tags; others do not', async () => {
  mockApiFetch.mockResolvedValue({ items: [subscribed, thread], total: 2, page: 1, pageSize: 25 });
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('هدى سالم');
  const row = within(screen.getByRole('button', { name: /أم يوسف/ }));
  expect(row.getByText(t.inbox.subscription.badge.subscribed)).toBeTruthy();
  expect(row.getByText(t.inbox.kind.guardian)).toBeTruthy();
  const lead = within(screen.getByRole('button', { name: /هدى سالم/ }));
  expect(lead.queryByText(t.inbox.subscription.badge.subscribed)).toBeNull();
});
