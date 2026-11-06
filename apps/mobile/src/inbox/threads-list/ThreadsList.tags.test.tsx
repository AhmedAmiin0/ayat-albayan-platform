import type { ThreadView } from '@ab/shared';
import { screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { InboxScreen } from '@/inbox/screens/InboxScreen';
import { thread } from '@/inbox/shared/thread-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// Invented rows (owner 2026-11-06: «remove the tags from the chat list»): a lead nobody answered,
// a guardian from an ad who owes money, and a converted lead.
const noReply: ThreadView = { ...thread, lead_status: 'no_reply', unread_count: 2 };
const guardian: ThreadView = {
  ...thread,
  phone_e164: '+966552147731',
  display_name: 'أم إيمان',
  guardian_id: 'g-1',
  guardian_name: 'أم إيمان',
  lead_source: 'instagram_ad',
  subscribed: true,
  badge: 'subscribed',
  unpaid: true,
};
const converted: ThreadView = {
  ...thread,
  phone_e164: '+966551234008',
  display_name: 'أبو مالك',
  lead_status: 'converted',
};

const rowOf = (name: string) => within(screen.getByRole('button', { name: new RegExp(name) }));

/** Every word a row once carried as a tag or chip. */
const TAG_WORDS = () => [
  t.enums.leadStatus.no_reply,
  t.enums.leadStatus.converted,
  t.enums.leadSource.facebook_ad,
  t.enums.leadSource.instagram_ad,
  t.inbox.kind.guardian,
  t.inbox.kind.lead,
  t.inbox.convertedLead,
  t.inbox.subscription.badge.subscribed,
  t.inbox.subscription.badge.expired,
  t.enums.subscriptionStatus.unpaid,
];

test('no row carries a tag: no status, source, role, package or money chip, no phone', async () => {
  mockApiFetch.mockResolvedValue({ items: [noReply, guardian, converted], total: 3, page: 1, pageSize: 25 });
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('هدى سالم');

  for (const name of ['هدى سالم', 'أم إيمان', 'أبو مالك']) {
    const row = rowOf(name);
    for (const word of TAG_WORDS()) expect(row.queryByText(word)).toBeNull();
    expect(row.queryByTestId('thread-meta')).toBeNull();
    expect(row.queryByText(/⁦/)).toBeNull();
  }
  expect(rowOf('هدى سالم').getByLabelText(t.inbox.unread.two)).toBeTruthy();
  expect(rowOf('هدى سالم').getByText(`${t.inbox.you} أهلًا بيكي`)).toBeTruthy();
});
