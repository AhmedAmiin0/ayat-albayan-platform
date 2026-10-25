import type { IntegrationConfigItem } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { LineDrivers } from './LineDrivers';

// docs/19: each line's driver on the phone, saved like the web (PUT /settings/integrations, audited there).

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
let mockPermissions = ['settings.read', 'settings.write'];
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));

const h = t.communicationsHub;
const item = (key: IntegrationConfigItem['key'], over: Partial<IntegrationConfigItem> = {}): IntegrationConfigItem => ({
  key, group: 'wa_notifications', secret: false, value: null, set: false, source: 'unset', updated_at: null, ...over,
});
const ITEMS = [item('WA_PROVIDER', { value: 'meta', set: true, source: 'db' }), item('WA_CHAT_PROVIDER'), item('WACRM_API_BASE', { set: true }), item('WACRM_API_KEY', { secret: true })];

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = ['settings.read', 'settings.write'];
  mockApiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? { permissions: mockPermissions } : ITEMS));
});

const pick = async (line: string, label: string) => fireEvent.press(within(screen.getByTestId(`driver-${line}`)).getByRole('radio', { name: label }));

test('picking «نظام CRM» saves nothing yet: it names what the CRM lacks and asks first; cancel keeps meta', async () => {
  await renderWithQuery(<LineDrivers />);
  expect(await screen.findByText(h.driverTitle)).toBeTruthy();
  await pick('notifications', t.integrations.options.crm);
  expect(screen.getByText(h.driverConfirm.replace('{driver}', t.integrations.options.crm))).toBeTruthy();
  expect(screen.getByText(ltr('WACRM_API_KEY'))).toBeTruthy();
  expect(screen.queryByText(ltr('WACRM_API_BASE'))).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByText(h.driverConfirm.replace('{driver}', t.integrations.options.crm))).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('the confirm saves only that line\'s key, like the web', async () => {
  mockApiSend.mockResolvedValue(ITEMS.map((i) => (i.key === 'WA_PROVIDER' ? { ...i, value: 'crm' } : i)));
  await renderWithQuery(<LineDrivers />);
  await screen.findByText(h.driverTitle);
  await pick('notifications', t.integrations.options.crm);
  await fireEvent.press(screen.getByRole('button', { name: h.driverConfirmYes }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PUT', '/settings/integrations', { values: { WA_PROVIDER: 'crm' } }));
  const saved = h.driverSaved.replace('{line}', t.enums.waLine.notifications).replace('{driver}', t.integrations.options.crm);
  expect(await screen.findByText(saved)).toBeTruthy();
});

test('without settings.write the choice is shown, not offered', async () => {
  mockPermissions = ['settings.read'];
  await renderWithQuery(<LineDrivers />);
  expect(await screen.findByText(h.driverReadOnly)).toBeTruthy();
  await pick('chat', t.integrations.options.kapso);
  expect(screen.queryByText(h.driverConfirmYes)).toBeNull();
});

test('module mode (comms_source = module): each number\'s provider sends, so a note and no switch', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/auth/me') return { permissions: mockPermissions };
    return path === '/settings' ? { comms_source: 'module' } : ITEMS;
  });
  await renderWithQuery(<LineDrivers />);
  expect(await screen.findByText(h.driverModule)).toBeTruthy();
  expect(screen.queryByTestId('driver-notifications')).toBeNull();
});

test('one save at a time: while a line saves, the other line\'s choices wait', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<LineDrivers />);
  await screen.findByText(h.driverTitle);
  await pick('notifications', t.integrations.options.crm);
  await fireEvent.press(screen.getByRole('button', { name: h.driverConfirmYes }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(1));
  await pick('chat', t.integrations.options.kapso);
  expect(within(screen.getByTestId('driver-chat')).queryByText(h.driverConfirm.replace('{driver}', t.integrations.options.kapso))).toBeNull();
});

test('an unreadable list (no settings.read): nothing shown', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/auth/me') return { permissions: [] };
    throw new Error('403');
  });
  await renderWithQuery(<LineDrivers />);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/settings/integrations'));
  expect(screen.queryByText(h.driverTitle)).toBeNull();
});

test('a failed save says so and keeps the confirm, to try again', async () => {
  mockApiSend.mockRejectedValue(new Error('500'));
  await renderWithQuery(<LineDrivers />);
  await screen.findByText(h.driverTitle);
  await pick('chat', t.integrations.options.kapso);
  await fireEvent.press(screen.getByRole('button', { name: h.driverConfirmYes }));
  expect(await screen.findByText(h.driverFailed)).toBeTruthy();
  expect(screen.getByRole('button', { name: h.driverConfirmYes })).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('PUT', '/settings/integrations', { values: { WA_CHAT_PROVIDER: 'kapso' } });
});
