import { formatPhone } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { closedGate, handCount, overviewAnswer, PUBLIC_PHONE } from './comms-fixtures';
import { CommsOverview } from './CommsOverview';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));

const h = t.communicationsHub;
const onOpenAudience = jest.fn();
const onOpenNumbers = jest.fn();
const show = () => renderWithQuery(<CommsOverview onOpenAudience={onOpenAudience} onOpenNumbers={onOpenNumbers} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(overviewAnswer);
});

test('send state read-only with the server gate and queue; nothing to switch, nothing sent', async () => {
  await show();
  expect(await screen.findByText(t.mobileAdmin.settings.messagingEnabled)).toBeTruthy();
  expect(screen.getByText(t.mobileAdmin.settings.readOnlyNote)).toBeTruthy();
  expect(await screen.findByText(t.inbox.messagingOff)).toBeTruthy();
  expect(screen.getByText(t.templates.settings.off)).toBeTruthy();
  expect(screen.getByText(t.templates.settings.queued.few.replace('{n}', String(closedGate.queued)))).toBeTruthy();
  expect(screen.queryAllByRole('switch')).toHaveLength(0);
  expect(screen.queryByLabelText(t.mobileAdmin.settings.messagingEnabled)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('numbers: the first two with health, the third counted, a button to «الأرقام»', async () => {
  await show();
  expect(await screen.findByText('Main line')).toBeTruthy();
  expect(screen.getByText('Chat line')).toBeTruthy();
  expect(screen.queryByText('Spare line')).toBeNull();
  expect(screen.getByText(t.numbers.health.ok)).toBeTruthy();
  expect(screen.getByText(h.mobile.moreNumbers.one)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: h.numbersOpen }));
  expect(onOpenNumbers).toHaveBeenCalledTimes(1);
});

test('«ماذا يُرسل الآن»: one row per audience with its counts; a row opens that audience', async () => {
  await show();
  expect(await screen.findByRole('header', { name: h.whatTitle })).toBeTruthy();
  for (const audience of ['guardian', 'teacher', 'lead', 'staff'] as const) {
    const { on, off } = handCount(audience);
    const open = h.openAudience.replace('{audience}', t.notificationCatalogue.audience[audience]);
    const row = await screen.findByRole('button', { name: new RegExp(`^${open}`) });
    expect(row.props.accessibilityLabel).toBe(`${open}: ${h.colOn} ${on}${t.common.listSeparator}${h.colOff} ${off}`);
  }
  const teacher = h.openAudience.replace('{audience}', t.notificationCatalogue.audience.teacher);
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${teacher}`) }));
  expect(onOpenAudience).toHaveBeenCalledWith('teacher');
});

test('the number shown to families, left-to-right and read-only, then the web note', async () => {
  await show();
  expect(await screen.findByText(ltr(formatPhone(PUBLIC_PHONE)))).toBeTruthy();
  expect(screen.getByText(h.publicNumber)).toBeTruthy();
  expect(screen.getByText(h.webOnly)).toBeTruthy();
});

test('no public number set: «غير محدد»', async () => {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/settings' ? { ...(await overviewAnswer(p) as object), academy_whatsapp_e164: '' } : overviewAnswer(p)));
  await show();
  expect(await screen.findByText(h.publicNumberNone)).toBeTruthy();
});

test('the catalogue and numbers down: each says so with a retry; the send state still shows', async () => {
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/admin/notifications' || p === '/admin/numbers' ? Promise.reject(new Error('offline')) : overviewAnswer(p),
  );
  await show();
  expect(await screen.findByText(t.notificationCatalogue.loadError)).toBeTruthy();
  expect(await screen.findByText(t.numbers.loadError)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.mobile.retry })).toHaveLength(2);
  expect(screen.getByText(t.mobileAdmin.settings.messagingEnabled)).toBeTruthy();
});
