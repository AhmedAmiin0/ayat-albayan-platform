import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ThreadsList } from '../ThreadsList';
import { EditListSheet } from './EditListSheet';
import { ListCheckRow } from './ListCheckRow';
import { answer, page, PAID, SUBSCRIBED, TEACHERS, withLists } from './list-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const L = t.inbox.lists;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(answer({ me: withLists, lists: [SUBSCRIBED, TEACHERS, PAID], threads: () => page([]) }));
});

test('an automatic list chip, once shown, says «تُحدَّث تلقائيًا» and who is added; a hand list says nothing', async () => {
  await renderWithQuery(<ThreadsList />);
  const row = within(await screen.findByLabelText(L.rowLabel));
  expect(screen.queryByTestId('auto-list-chip')).toBeNull();
  await fireEvent.press(await row.findByRole('tab', { name: SUBSCRIBED.name }));
  expect(await screen.findByText(L.autoRule.subscribed)).toBeTruthy();
  expect(screen.getByLabelText(`${L.auto}. ${L.autoRule.subscribed}`)).toBeTruthy();
  await fireEvent.press(row.getByRole('tab', { name: TEACHERS.name }));
  expect(await screen.findByText(L.autoRule.teachers)).toBeTruthy();
  await fireEvent.press(row.getByRole('tab', { name: PAID.name }));
  expect(screen.queryByTestId('auto-list-chip')).toBeNull();
});

test('the checklist row of an automatic list shows the chip and the line, keeps its name, and toggles by hand', async () => {
  const onToggle = jest.fn();
  await renderWithQuery(<ListCheckRow list={TEACHERS} checked onToggle={onToggle} />);
  const box = screen.getByRole('checkbox', { name: TEACHERS.name });
  expect(box.props.accessibilityHint).toBe(`${L.auto}. ${L.autoRule.teachers}`);
  expect(screen.getByText(L.auto)).toBeTruthy();
  await fireEvent.press(box);
  expect(onToggle).toHaveBeenCalled();
});

test('a hand list row has no chip; the edit sheet of an automatic list explains it and still renames or deletes', async () => {
  await renderWithQuery(<ListCheckRow list={PAID} checked={false} onToggle={jest.fn()} />);
  expect(screen.queryByTestId('auto-list-chip')).toBeNull();
  await renderWithQuery(<EditListSheet list={SUBSCRIBED} onClose={jest.fn()} />);
  expect(screen.getByText(L.autoRule.subscribed)).toBeTruthy();
  expect(screen.getByRole('button', { name: L.delete })).toBeTruthy();
  expect(screen.getByRole('button', { name: L.save })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: L.delete }));
  expect(screen.getByText(new RegExp(L.autoDeleteNote))).toBeTruthy();
});
