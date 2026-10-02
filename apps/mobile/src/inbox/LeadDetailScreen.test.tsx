import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/lib/i18n';
import { listKey } from '@/lib/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { cachedList, huda, unnamed } from './fixtures';
import { LeadDetailScreen } from './LeadDetailScreen';

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

beforeEach(() => {
  mockBack.mockReset();
  mockPush.mockReset();
  mockParams.id = 'a1';
});

test('the lead comes from the cached inbox: name, isolated phone, source, status', async () => {
  await renderWithQuery(<LeadDetailScreen />, seeded());
  expect(screen.getByRole('header', { name: 'هدى سالم' })).toBeTruthy();
  expect(screen.getByText(ltr('+966 55 214 7730'))).toBeTruthy();
  expect(screen.getByText(t.enums.leadSource.facebook_ad)).toBeTruthy();
  expect(screen.getByText(t.leads.lastInboundAt)).toBeTruthy();
  expect(screen.getAllByText(t.enums.leadStatus.new).length).toBeGreaterThan(0);
});

test('an unnamed lead is titled by its isolated phone and has no last-message line', async () => {
  mockParams.id = 'b2';
  await renderWithQuery(<LeadDetailScreen />, seeded());
  expect(screen.getByRole('header', { name: ltr('+20 10 1234 5678') })).toBeTruthy();
  expect(screen.queryByText(t.leads.lastInboundAt)).toBeNull();
});

test('«فتح واتساب» opens wa.me for the lead', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<LeadDetailScreen />, seeded());
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.openWhatsapp }));
  expect(open).toHaveBeenCalledWith('https://wa.me/966552147730');
});

test('«افتح المحادثة» opens the WhatsApp thread of the lead (encoded +)', async () => {
  await renderWithQuery(<LeadDetailScreen />, seeded());
  const label = t.inbox.openThread.replace('{name}', 'هدى سالم');
  await fireEvent.press(screen.getByRole('button', { name: label }));
  expect(mockPush).toHaveBeenCalledWith('/inbox/thread/%2B966552147730');
});

test('«حجز حلقة تجريبية» opens the quick trial booking for this lead (R-MOB-02)', async () => {
  await renderWithQuery(<LeadDetailScreen />, seeded());
  await fireEvent.press(screen.getByRole('button', { name: 'حجز حلقة تجريبية لهدى سالم' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/inbox/book', params: { leadId: 'a1' } });
});

test('«رجوع» pops back to the inbox', async () => {
  await renderWithQuery(<LeadDetailScreen />, seeded());
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
