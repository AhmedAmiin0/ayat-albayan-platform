import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ThreadsList } from '../ThreadsList';
import { answer, page, PAID, TRIAL, withLists } from './list-fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

let mockLists = [PAID, TRIAL];
const chips = () => within(screen.getByLabelText(t.inbox.lists.rowLabel));
const editTitle = t.inbox.lists.editNamed.replace('{name}', PAID.name);

async function editPaid() {
  await renderWithQuery(<ThreadsList />);
  const chip = await screen.findByRole('tab', { name: PAID.name });
  await fireEvent.press(chip);
  await fireEvent(chip, 'longPress');
  expect(await screen.findByText(editTitle)).toBeTruthy();
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  mockLists = [PAID, TRIAL];
  mockApiFetch.mockImplementation((p: string) => answer({ me: withLists, lists: mockLists, threads: () => page() })(p));
});

test('a list chip names its edit action and hint for screen readers; the action opens the sheet', async () => {
  await renderWithQuery(<ThreadsList />);
  const chip = await screen.findByRole('tab', { name: TRIAL.name });
  expect(chip.props.accessibilityHint).toBe(t.inbox.lists.editHint);
  expect(chip.props.accessibilityActions).toEqual([{ name: 'longpress', label: t.inbox.lists.edit }]);
  expect(chips().getByRole('tab', { name: t.inbox.lists.all }).props.accessibilityActions).toBeUndefined();
  await fireEvent(chip, 'accessibilityAction', { nativeEvent: { actionName: 'longpress' } });
  expect(await screen.findByText(t.inbox.lists.editNamed.replace('{name}', TRIAL.name))).toBeTruthy();
});

test('long-press → rename: PATCH with the trimmed name, the chip shows it; a taken name inline', async () => {
  await editPaid();
  mockApiSend.mockRejectedValueOnce(new ApiError(409, { code: 'list_name_taken' }));
  await fireEvent.changeText(screen.getByLabelText(t.inbox.lists.name), TRIAL.name);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.lists.save }));
  expect(await screen.findByText(t.inbox.lists.nameTaken)).toBeTruthy();
  const renamed = { ...PAID, name: 'دفعت' };
  mockApiSend.mockResolvedValueOnce(renamed);
  mockLists = [renamed, TRIAL];
  await fireEvent.changeText(screen.getByLabelText(t.inbox.lists.name), ' دفعت ');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.lists.save }));
  expect(mockApiSend).toHaveBeenLastCalledWith('PATCH', `/chat-lists/${PAID.id}`, { name: 'دفعت' });
  expect(await chips().findByRole('tab', { name: 'دفعت', selected: true })).toBeTruthy();
  expect(screen.queryByText(editTitle)).toBeNull();
});

test('delete asks first (the chats stay); «إلغاء» keeps it, yes deletes and the row falls back to «الكل»', async () => {
  await editPaid();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.lists.delete }));
  const question = `${t.inbox.lists.deleteConfirm.replace('{name}', PAID.name)} ${t.inbox.lists.deleteNote}`;
  expect(screen.getByText(question)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByText(question)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.lists.delete }));
  mockApiSend.mockResolvedValueOnce(undefined);
  mockLists = [TRIAL];
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.lists.deleteYes }));
  expect(mockApiSend).toHaveBeenCalledWith('DELETE', `/chat-lists/${PAID.id}`);
  await waitFor(() => expect(screen.queryByRole('tab', { name: PAID.name })).toBeNull());
  expect(chips().getByRole('tab', { name: t.inbox.lists.all, selected: true })).toBeTruthy();
  expect(screen.queryByText(editTitle)).toBeNull();
});
