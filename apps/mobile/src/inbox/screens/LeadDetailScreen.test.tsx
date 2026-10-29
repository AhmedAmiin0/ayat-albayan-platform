import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { listKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { cachedList, huda, unnamed } from '../shared/fixtures';
import { LeadDetailScreen } from './LeadDetailScreen';
import { answer, hudaProfile } from '../qualification/fixtures';

// GET /leads?q=phone (the fresh row under the facts) and /settings; huda answers for any phone.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockParams = { id: 'a1' };
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: (mockTo: unknown) => mockPush(mockTo) },
  useLocalSearchParams: () => mockParams,
}));

function seeded() {
  const client = createTestQueryClient();
  client.setQueryData(listKey('/leads', { q: '' }), cachedList([huda, unnamed]));
  return client;
}

/** The stage line needs both the fresh row and /settings: once it shows, nothing is in flight. */
const settled = t.followUps.stage.replace('{n}', '1').replace('{total}', '3');

async function openLead() {
  await renderWithQuery(<LeadDetailScreen />, seeded());
  await screen.findByText(settled);
}

beforeEach(() => {
  mockApiFetch.mockImplementation(answer(hudaProfile));
  mockBack.mockReset();
  mockPush.mockReset();
  mockParams.id = 'a1';
});

test('the lead comes from the cached inbox: name, isolated phone, source, status', async () => {
  await openLead();
  expect(screen.getByRole('header', { name: 'هدى سالم' })).toBeTruthy();
  expect(screen.getByText(ltr('+966 55 214 7730'))).toBeTruthy();
  expect(screen.getByText(t.enums.leadSource.facebook_ad)).toBeTruthy();
  expect(screen.getByText(t.leads.lastInboundAt)).toBeTruthy();
  expect(screen.getAllByText(t.enums.leadStatus.new).length).toBeGreaterThan(0);
});

test('an unnamed lead is titled by its isolated phone and has no last-message line', async () => {
  mockParams.id = 'b2';
  mockApiFetch.mockImplementation(answer({ ...unnamed, status: 'no_reply', follow_up_stage: 1 }));
  await openLead();
  expect(screen.getByRole('header', { name: ltr('+20 10 1234 5678') })).toBeTruthy();
  expect(screen.queryByText(t.leads.lastInboundAt)).toBeNull();
});

test('under the actions: the follow-up and «بيانات الطالب», from the fresh row (R-LEAD-03/05)', async () => {
  await openLead();
  expect(screen.getByRole('header', { name: t.followUps.title })).toBeTruthy();
  expect(screen.getByRole('header', { name: t.leads.qualification })).toBeTruthy();
  expect(await screen.findByDisplayValue('سهيلة')).toBeTruthy();
  expect(screen.getByRole('button', { name: t.followUps.pause })).toBeTruthy();
});

test('«فتح واتساب» opens wa.me for the lead', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await openLead();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.openWhatsapp }));
  expect(open).toHaveBeenCalledWith('https://wa.me/966552147730');
});

test('«افتح المحادثة» opens the WhatsApp thread of the lead (encoded +)', async () => {
  await openLead();
  const label = t.inbox.openThread.replace('{name}', 'هدى سالم');
  await fireEvent.press(screen.getByRole('button', { name: label }));
  expect(mockPush).toHaveBeenCalledWith('/inbox/thread/%2B966552147730');
});

test('«حجز حلقة تجريبية» opens the quick trial booking for this lead (R-MOB-02)', async () => {
  await openLead();
  await fireEvent.press(screen.getByRole('button', { name: 'حجز حلقة تجريبية لهدى سالم' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/inbox/book', params: { leadId: 'a1' } });
});

test.each(['converted', 'lost'] as const)('a %s lead books no trial here (its number may be a family\'s now)', async (status) => {
  mockApiFetch.mockImplementation(answer({ ...hudaProfile, status }));
  const client = createTestQueryClient();
  client.setQueryData(listKey('/leads', { q: '' }), cachedList([{ ...huda, status }, unnamed]));
  await renderWithQuery(<LeadDetailScreen />, client);
  expect(await screen.findByRole('button', { name: t.mobile.openWhatsapp })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'حجز حلقة تجريبية لهدى سالم' })).toBeNull();
});

test('«رجوع» pops back to the inbox', async () => {
  await openLead();
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(mockBack).toHaveBeenCalled();
});

test('a lead in no cached list: not found with retry, nothing invented', async () => {
  mockParams.id = 'zz';
  await renderWithQuery(<LeadDetailScreen />, createTestQueryClient());
  expect(await screen.findByText(t.common.notFound)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.mobile.retry })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.mobile.openWhatsapp })).toBeNull();
});
