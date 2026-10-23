import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { settings } from '../fixtures';
import { groupLabel } from './value-groups';
import { labelOf } from './value-text';
import { meta, WRITER } from './values-fixtures';
import { ValuesScreen } from './ValuesScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));

// Stored values that differ from the defaults (5 weeks, 180 days), so «أعد القيمة الافتراضية» shows.
const stored = { ...settings, booking_horizon_weeks: 8, activity_retention_days: 90 };

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation((p: string) =>
    Promise.resolve(p === '/auth/me' ? { role: 'admin', permissions: WRITER } : p === '/config/meta' ? meta : stored),
  );
  mockApiSend.mockResolvedValue(stored);
});

const HORIZON = labelOf('booking_horizon_weeks');
const openRow = async (label: string, group?: Parameters<typeof groupLabel>[0]) => {
  await renderWithQuery(<ValuesScreen />);
  await screen.findByText(HORIZON);
  if (group) await fireEvent.press(screen.getByRole('radio', { name: new RegExp(groupLabel(group).replace(/[()]/g, '.')) }));
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`«${label}»`) }));
  return screen.getByTestId('value-sheet');
};

/** No ancestor groups the element into one accessible control (a screen reader reaches it alone). */
const reachableAlone = (el: ReturnType<typeof screen.getByTestId>) => {
  for (let node = el.parent; node; node = node.parent) {
    if (typeof node.type === 'string' && node.props.accessible === true) return false;
  }
  return true;
};

test('D4: the scrim is a hidden sibling; the editor and «احفظ» are reached on their own', async () => {
  const sheet = await openRow(HORIZON);
  expect(sheet.props.accessibilityViewIsModal).toBe(true);
  const scrim = screen.getByTestId('value-sheet-scrim', { includeHiddenElements: true });
  expect(scrim.props.accessible).toBe(false);
  expect(scrim.props.importantForAccessibility).toBe('no');
  expect(within(sheet).queryByTestId('value-sheet-scrim')).toBeNull();
  expect(reachableAlone(within(sheet).getByLabelText(HORIZON))).toBe(true);
  expect(reachableAlone(within(sheet).getByRole('button', { name: t.config.custom.save }))).toBe(true);
  // A tap on the scrim with an edit asks first.
  await fireEvent.changeText(within(sheet).getByLabelText(HORIZON), '9');
  await fireEvent.press(scrim);
  expect(screen.getByText(t.mobileValues.unsavedClose)).toBeTruthy();
});

test('D18: «إلغاء» comes before «احفظ» in the sheet', async () => {
  const sheet = await openRow(HORIZON);
  const cancel = within(sheet).getByRole('button', { name: t.config.custom.cancel });
  const save = within(sheet).getByRole('button', { name: t.config.custom.save });
  const all = within(sheet).getAllByRole('button');
  expect(all.indexOf(cancel)).toBeLessThan(all.indexOf(save));
});

test('D20: «أعد القيمة الافتراضية» puts the default in the draft; «احفظ» saves it', async () => {
  const sheet = await openRow(HORIZON);
  await fireEvent.press(within(sheet).getByRole('button', { name: t.settingsValues.resetDefault }));
  expect(within(sheet).getByLabelText(HORIZON).props.value).toBe('5');
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(within(sheet).getByRole('button', { name: t.config.custom.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/settings', { bookingHorizonWeeks: 5 }));
});

test('D20: «للمطوّر» is closed, and opens to the key', async () => {
  const sheet = await openRow(HORIZON);
  const dev = within(sheet).getByRole('button', { name: t.settingsValues.sheet.dev });
  expect(dev.props.accessibilityState).toEqual({ expanded: false });
  expect(within(sheet).queryByText(ltr('booking_horizon_weeks'))).toBeNull();
  await fireEvent.press(dev);
  expect(within(sheet).getByText(ltr('booking_horizon_weeks'))).toBeTruthy();
});

test('D20: a confirmed switch says what it does, with its tag', async () => {
  const label = labelOf('teachers_always_available');
  const sheet = await openRow(label, 'schedule');
  expect(within(sheet).getByText(t.settingsValues.tags.confirm)).toBeTruthy();
  const m = t.mobileAdmin.settings;
  await fireEvent.press(within(sheet).getByRole('radio', { name: settings.teachers_always_available ? m.off : m.on }));
  await fireEvent.press(within(sheet).getByRole('button', { name: t.config.custom.save }));
  expect(within(sheet).getByText(t.mobileValues.plainConfirm)).toBeTruthy();
  // The impact sentence is in the question too (it is also the sheet's description).
  expect(within(sheet).getAllByText(t.settings.hints.teachersAlwaysAvailable)).toHaveLength(2);
});

test('D22: shortening a retention asks to type the days; the box comes before its «احفظ»', async () => {
  const label = labelOf('activity_retention_days');
  const sheet = await openRow(label, 'retention');
  await fireEvent.changeText(within(sheet).getByLabelText(label), '30');
  await fireEvent.press(within(sheet).getByRole('button', { name: t.config.custom.save }));
  const box = within(sheet).getByLabelText(t.mobileValues.typedLabel);
  const confirm = within(sheet).getByRole('button', { name: t.common.save });
  // Tree (= reading) order, depth-first.
  const order: unknown[] = [];
  const visit = (n: { children?: readonly unknown[] }) => {
    if (n === box || n === confirm) order.push(n);
    for (const c of n.children ?? []) if (typeof c === 'object' && c !== null) visit(c);
  };
  visit(sheet);
  expect(order).toEqual([box, confirm]);
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('D22: lengthening a retention saves without typing', async () => {
  const label = labelOf('activity_retention_days');
  const sheet = await openRow(label, 'retention');
  await fireEvent.changeText(within(sheet).getByLabelText(label), '365');
  await fireEvent.press(within(sheet).getByRole('button', { name: t.config.custom.save }));
  expect(screen.queryByLabelText(t.mobileValues.typedLabel)).toBeNull();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/settings', { activityRetentionDays: 365 }));
});
