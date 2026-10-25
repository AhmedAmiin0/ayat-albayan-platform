import { formatPhone } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { readOnlyNoteText } from '../ReadOnlySettings';
import { closedGate, handCount, overviewAnswer, PUBLIC_PHONE } from './comms-fixtures';
import { GATE_LINE_SEPARATOR } from './gate-words';
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
  expect(screen.getByText(readOnlyNoteText(h.webOnly))).toBeTruthy();
  const queued = t.templates.settings.queued.few.replace('{n}', String(closedGate.queued));
  expect(await screen.findByText(`${t.inbox.messagingOff}${GATE_LINE_SEPARATOR}${queued}`)).toBeTruthy();
  expect(screen.getByText(t.templates.settings.off)).toBeTruthy();
  expect(screen.queryAllByRole('switch')).toHaveLength(0);
  expect(screen.queryByLabelText(t.mobileAdmin.settings.messagingEnabled)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('numbers: the first with its health, the other two counted, a button to «الأرقام»', async () => {
  await show();
  expect(await screen.findByText('Main line')).toBeTruthy();
  expect(screen.queryByText('Chat line')).toBeNull();
  expect(screen.queryByText('Spare line')).toBeNull();
  expect(screen.getByText(t.numbers.health.ok)).toBeTruthy();
  expect(screen.getByText(h.mobile.moreNumbers.two)).toBeTruthy();
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

test('the number shown to families, left-to-right and read-only; the web line is not a block of its own', async () => {
  await show();
  expect(await screen.findByText(ltr(formatPhone(PUBLIC_PHONE)))).toBeTruthy();
  expect(screen.getByText(h.publicNumber)).toBeTruthy();
  expect(screen.queryByText(h.webOnly)).toBeNull();
});

test('messaging on: no in-app-only line; off: the counts are said to be in-app alerts only', async () => {
  await show();
  expect(await screen.findByRole('header', { name: h.whatTitle })).toBeTruthy();
  await screen.findAllByRole('button', { name: new RegExp(h.colOn) });
  expect(screen.queryByText(h.inAppOnlyNote)).toBeNull();
});

test('messaging off: «ماذا يُرسل الآن» says the counted rows are in-app alerts only', async () => {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/settings' ? { ...(await overviewAnswer(p) as object), messaging_enabled: false } : overviewAnswer(p)));
  await show();
  expect(await screen.findByText(h.inAppOnlyNote)).toBeTruthy();
});

test('open under the allow-list: the chip says so, never a plain «يعمل»', async () => {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/messages/gate' ? { open: true, reason: null, queued: 0, restricted: true } : overviewAnswer(p)));
  await show();
  expect(await screen.findByText(t.templates.settings.onRestricted)).toBeTruthy();
  expect(screen.queryByText(t.templates.settings.on)).toBeNull();
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
