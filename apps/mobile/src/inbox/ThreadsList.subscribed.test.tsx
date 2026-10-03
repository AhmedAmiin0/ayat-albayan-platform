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

test('rows also say what needs the admin: «انتهت الباقة» and «غير مدفوع» (act); a converted lead is «تحوّل إلى طالب», not «مشترك»', async () => {
  const ended: ThreadView = { ...subscribed, phone_e164: '+966552147732', display_name: 'أم ليان', subscribed: false, badge: 'expired', unpaid: false };
  const owes: ThreadView = { ...subscribed, phone_e164: '+966552147733', display_name: 'أم جود', badge: 'subscribed', unpaid: true };
  const converted: ThreadView = { ...thread, phone_e164: '+966551234008', display_name: 'أبو مالك', lead_status: 'converted' };
  mockApiFetch.mockResolvedValue({ items: [ended, owes, converted], total: 3, page: 1, pageSize: 25 });
  await renderWithQuery(<InboxScreen />);
  const row = async (name: string) => within(await screen.findByRole('button', { name: new RegExp(name) }));
  const tone = (r: Awaited<ReturnType<typeof row>>, label: string) => {
    let node = r.getByText(label).parent;
    while (node && !String(node.props.testID ?? '').startsWith('chip-')) node = node.parent;
    return node?.props.testID;
  };

  expect(tone(await row('أم ليان'), t.inbox.subscription.badge.expired)).toBe('chip-act');
  expect(tone(await row('أم جود'), t.enums.subscriptionStatus.unpaid)).toBe('chip-act');
  const malik = await row('أبو مالك');
  expect(malik.queryByText(t.enums.leadStatus.converted)).toBeNull();
  expect(tone(malik, t.inbox.convertedLead)).toBe('chip-neutral');
});
