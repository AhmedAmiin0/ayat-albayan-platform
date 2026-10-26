import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { settings } from '../../shared/fixtures';
import { googleLive } from '../../google-sync/google-status.fixtures';
import { googleValues } from '../lib/google-values';
import { labelOf } from '../lib/value-text';
import { meta, READER, WRITER } from '../testing/values-fixtures';
import { ValuesScreen } from './ValuesScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));

const answer = (permissions: string[], role = 'admin') => (p: string) =>
  Promise.resolve(
    p === '/auth/me' ? { role, permissions } : p === '/config/meta' ? meta : p === '/admin/google/status' ? googleLive : settings,
  );
const googleChip = () => screen.queryByRole('radio', { name: new RegExp(t.mobileValues.groups.google.replace(/[()]/g, '.')) });

beforeEach(() => jest.clearAllMocks());

test('D19: while GET /settings has not answered, «القيم» shows a busy loading region', async () => {
  mockApiFetch.mockImplementation((p: string) => (p === '/settings' ? new Promise(() => undefined) : answer(WRITER)(p)));
  await renderWithQuery(<ValuesScreen />, createTestQueryClient({ meFromApi: true }));
  const loading = screen.getByLabelText(t.common.loading);
  expect(loading.props.accessibilityState).toEqual({ busy: true });
});

test('D24: without settings.write no row says «عدّل»; each reads «الاسم: القيمة»', async () => {
  mockApiFetch.mockImplementation(answer(READER));
  await renderWithQuery(<ValuesScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByRole('button', { name: `${labelOf('booking_horizon_weeks')}: 5` });
  // «عدّل «{label}»: {value}» → the verb that a read-only row must not say.
  const verb = t.mobileValues.edit.replace(/«\{label\}».*$/, '').trim();
  expect(verb.length).toBeGreaterThan(0);
  for (const row of screen.getAllByRole('button')) {
    expect(String(row.props.accessibilityLabel ?? '').startsWith(verb)).toBe(false);
  }
});

test('D31: «مزامنة Google» chip: its three values read-only with «تُدار من صفحة أخرى»', async () => {
  mockApiFetch.mockImplementation(answer(WRITER));
  await renderWithQuery(<ValuesScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(labelOf('booking_horizon_weeks'));
  const chip = googleChip();
  expect(chip).toBeTruthy();
  if (chip) await fireEvent.press(chip);
  const rows = googleValues(googleLive.settings);
  for (const row of rows) {
    expect(await screen.findByLabelText(`${row.label}: ${row.value}`)).toBeTruthy();
  }
  expect(screen.getByText(t.mobileValues.owned)).toBeTruthy();
  expect(screen.queryByRole('button', { name: new RegExp(rows[0]?.label ?? '-') })).toBeNull();
});

test('D31: no «مزامنة Google» chip without the admin role (no Google request)', async () => {
  mockApiFetch.mockImplementation(answer(WRITER, 'sales'));
  await renderWithQuery(<ValuesScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(labelOf('booking_horizon_weeks'));
  expect(googleChip()).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/admin/google/status');
});

test('googleValues: «—» before the status loads', () => {
  expect(googleValues(undefined).map((r) => r.value)).toEqual(['—', '—', '—']);
  expect(googleValues(googleLive.settings).map((r) => r.value)).toEqual([
    t.googleSync.switches.on,
    t.googleSync.switches.live,
    t.settingsValues.units.days.other.replace('{n}', '30'),
  ]);
});

test('D31: a row being saved says «جارٍ الحفظ…» on its second line', async () => {
  mockApiFetch.mockImplementation(answer(WRITER));
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<ValuesScreen />, createTestQueryClient({ meFromApi: true }));
  const label = labelOf('booking_horizon_weeks');
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`«${label}»`) }));
  await fireEvent.changeText(screen.getByLabelText(label), '8');
  await fireEvent.press(screen.getByRole('button', { name: t.config.custom.save }));
  await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(t.settingsValues.saving) })).toBeTruthy());
  expect(screen.getAllByText(t.settingsValues.saving).length).toBeGreaterThan(0);
});
