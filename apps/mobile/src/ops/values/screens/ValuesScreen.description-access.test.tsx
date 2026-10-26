import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { entriesAnswer, entryOf, type EntriesAnswer } from '../testing/entries-fixtures';
import { groupLabel } from '../lib/value-groups';
import { labelOf } from '../lib/value-text';
import { READER, WRITER } from '../testing/values-fixtures';
import { ValuesScreen } from './ValuesScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: jest.fn(),
}));
jest.mock('@/core/lib/i18n/i18n-overrides', () => ({ refreshOverrides: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

const EDIT = t.mobileValues.description.edit;
const HORIZON = labelOf('booking_horizon_weeks');

const open = async (answer: EntriesAnswer) => {
  mockApiFetch.mockImplementation(entriesAnswer(answer));
  await renderWithQuery(<ValuesScreen />, createTestQueryClient({ meFromApi: true }));
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^(عدّل «)?${HORIZON}`) }));
};

const openComms = async (permissions: string[]) => {
  const entries = [entryOf('comms_source', { ownedBy: 'communications', description: 'مصدر الرسائل' })];
  mockApiFetch.mockImplementation(entriesAnswer({ permissions, entries }));
  await renderWithQuery(<ValuesScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(HORIZON);
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(groupLabel('sending').replace(/[()]/g, '.')) }));
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${labelOf('comms_source')}: `) }));
  await screen.findByText('مصدر الرسائل');
};

test('without settings.write: the description is shown, without «عدّل الوصف»', async () => {
  await open({ permissions: READER, entries: [entryOf('booking_horizon_weeks', { description: 'نص المدير' })] });
  expect(await screen.findByText('نص المدير')).toBeTruthy();
  expect(screen.queryByRole('button', { name: EDIT })).toBeNull();
});

test('a key owned by «التواصل» needs numbers.manage to edit its description', async () => {
  await openComms(WRITER);
  expect(screen.queryByRole('button', { name: EDIT })).toBeNull();
});

test('with numbers.manage the owned key offers «عدّل الوصف»', async () => {
  await openComms([...WRITER, 'numbers.manage']);
  expect(screen.getByRole('button', { name: EDIT })).toBeTruthy();
});

test('an older API without GET /config/entries: today\'s hint, no button, no error', async () => {
  await open({ permissions: WRITER, entries: new ApiError(404) });
  expect(await screen.findByText(t.settings.hints.bookingHorizonWeeks)).toBeTruthy();
  expect(screen.queryByRole('button', { name: EDIT })).toBeNull();
  expect(screen.getByLabelText(HORIZON)).toBeTruthy();
});
