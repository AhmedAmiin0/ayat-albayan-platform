import type { LeadStatus, ThreadView } from '@ab/shared';
import { screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { InboxScreen } from '../screens/InboxScreen';
import { thread } from '../shared/thread-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// Invented rows: a lead nobody answered (unread), a guardian who came from an ad, and a status
// the DB has but this build does not know yet.
const noReply: ThreadView = { ...thread, lead_status: 'no_reply', unread_count: 2 };
const guardian: ThreadView = {
  ...thread,
  phone_e164: '+966552147731',
  display_name: 'أم إيمان',
  guardian_id: 'g-1',
  guardian_name: 'أم إيمان',
  lead_source: 'instagram_ad',
};
const unknown: ThreadView = {
  ...thread,
  phone_e164: '+966552147732',
  display_name: 'نور',
  lead_status: 'frozen' as unknown as LeadStatus,
  lead_source: null,
};

const rowOf = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

test('every thread row shows its tags like the web row: status chip, source, who the number is', async () => {
  mockApiFetch.mockResolvedValue({ items: [noReply, guardian, unknown], total: 3, page: 1, pageSize: 25 });
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('هدى سالم');

  const lead = within(rowOf('هدى سالم'));
  expect(lead.getByText(t.enums.leadStatus.no_reply)).toBeTruthy();
  expect(lead.getByText(t.enums.leadSource.facebook_ad)).toBeTruthy();
  expect(lead.queryByText(t.inbox.kind.lead)).toBeNull(); // not «عميل جديد» for a lead that never replied
  expect(lead.getByLabelText(t.inbox.unread.two)).toBeTruthy();
  expect(lead.getByText(`${t.inbox.you} أهلًا بيكي`)).toBeTruthy();

  const parent = within(rowOf('أم إيمان'));
  expect(parent.getByText(t.inbox.kind.guardian)).toBeTruthy();
  expect(parent.getByText(t.enums.leadSource.instagram_ad)).toBeTruthy();
  expect(parent.queryByText(t.enums.leadStatus.new)).toBeNull();

  const newer = within(rowOf('نور'));
  expect(newer.getByText('frozen')).toBeTruthy();
  expect(newer.getByTestId('chip-neutral')).toBeTruthy();
});
