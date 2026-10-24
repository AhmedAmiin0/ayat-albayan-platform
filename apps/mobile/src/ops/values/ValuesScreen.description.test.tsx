import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { entriesAnswer, entryOf } from './entries-fixtures';
import { labelOf } from './value-text';
import { WRITER } from './values-fixtures';
import { ValuesScreen } from './ValuesScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
const mockRefresh = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('@/lib/i18n-overrides', () => ({ refreshOverrides: () => mockRefresh() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));

const d = t.mobileValues.description;
const HORIZON = labelOf('booking_horizon_weeks');
const PATH = '/config/entries/booking_horizon_weeks/description';

const openSheet = async (edited = false) => {
  const entry = entryOf('booking_horizon_weeks', edited ? { description: 'وصف كتبه المدير', descriptionEdited: true } : {});
  mockApiFetch.mockImplementation(entriesAnswer({ permissions: WRITER, entries: [entry] }));
  await renderWithQuery(<ValuesScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`«${HORIZON}»`) }));
  const sheet = screen.getByTestId('value-sheet');
  return { sheet, edit: await within(sheet).findByRole('button', { name: d.edit }) };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRefresh.mockResolvedValue(true);
  mockApiSend.mockResolvedValue({ entry: entryOf('booking_horizon_weeks') });
});

test('the sheet shows the stored description; «عدّل الوصف» opens the editor with it and a counter', async () => {
  const { sheet, edit } = await openSheet(true);
  expect(within(sheet).getByText('وصف كتبه المدير')).toBeTruthy();
  await fireEvent.press(edit);
  const box = within(sheet).getByLabelText(d.label);
  expect(box.props.value).toBe('وصف كتبه المدير');
  expect(box.props.multiline).toBe(true);
  expect(within(sheet).getByText('15 / 500')).toBeTruthy();
  await fireEvent.changeText(box, 'نص');
  expect(within(sheet).getByText('2 / 500')).toBeTruthy();
  // The value editor is not shown while the description is edited.
  expect(within(sheet).queryByLabelText(HORIZON)).toBeNull();
});

test('without an admin text the editor starts from the hint and has no «أعد الوصف الأصلي»', async () => {
  const { sheet, edit } = await openSheet();
  await fireEvent.press(edit);
  expect(within(sheet).getByLabelText(d.label).props.value).toBe(t.settings.hints.bookingHorizonWeeks);
  expect(within(sheet).queryByRole('button', { name: d.restore })).toBeNull();
});

test('«احفظ» sends the trimmed text, announces it and returns to the value', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  const { sheet, edit } = await openSheet();
  await fireEvent.press(edit);
  await fireEvent.changeText(within(sheet).getByLabelText(d.label), '  وصف جديد  ');
  await fireEvent.press(within(sheet).getByRole('button', { name: d.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PUT', PATH, { text: 'وصف جديد' }));
  await waitFor(() => expect(announce).toHaveBeenCalledWith(d.saved));
  expect(mockRefresh).toHaveBeenCalled();
  expect(screen.getByText(d.saved)).toBeTruthy();
  expect(within(sheet).getByLabelText(HORIZON)).toBeTruthy();
});

test('«أعد الوصف الأصلي» sends null', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  const { sheet, edit } = await openSheet(true);
  await fireEvent.press(edit);
  await fireEvent.press(within(sheet).getByRole('button', { name: d.restore }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PUT', PATH, { text: null }));
  await waitFor(() => expect(announce).toHaveBeenCalledWith(d.restored));
});

test('an empty text is not sent; a refused save stays inside the sheet', async () => {
  const { sheet, edit } = await openSheet();
  await fireEvent.press(edit);
  await fireEvent.changeText(within(sheet).getByLabelText(d.label), '   ');
  await fireEvent.press(within(sheet).getByRole('button', { name: d.save }));
  expect(within(sheet).getByText(d.required)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  mockApiSend.mockRejectedValueOnce(new ApiError(403));
  await fireEvent.changeText(within(sheet).getByLabelText(d.label), 'وصف');
  await fireEvent.press(within(sheet).getByRole('button', { name: d.save }));
  expect(await within(sheet).findByText(d.forbidden)).toBeTruthy();
  expect(within(sheet).getByLabelText(d.label).props.value).toBe('وصف');
});

test('«إلغاء» returns to the value without sending; value saves still use PATCH /settings', async () => {
  const { sheet, edit } = await openSheet();
  await fireEvent.press(edit);
  await fireEvent.press(within(sheet).getByRole('button', { name: d.cancel }));
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(within(sheet).getByLabelText(HORIZON), '9');
  await fireEvent.press(within(sheet).getByRole('button', { name: t.config.custom.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/settings', { bookingHorizonWeeks: 9 }));
});
