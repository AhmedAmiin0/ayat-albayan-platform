import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { listKey } from '@/lib/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { cachedList, huda, page, unnamed } from './fixtures';
import { InboxScreen } from './InboxScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

test('rows: name, isolated phone, source, status chip; an unnamed lead is titled by its phone', async () => {
  mockApiFetch.mockResolvedValue(page([huda, unnamed], 2));
  await renderWithQuery(<InboxScreen />);
  expect(await screen.findByText('هدى سالم')).toBeTruthy();
  expect(screen.getByRole('header', { name: t.leads.title })).toBeTruthy();
  expect(screen.getByText(ltr('+966 55 214 7730'))).toBeTruthy();
  expect(screen.getByText(ltr('+20 10 1234 5678'))).toBeTruthy();
  expect(screen.getByText('ه', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText(new RegExp(t.enums.leadSource.facebook_ad))).toBeTruthy();
  expect(screen.getAllByText(t.enums.leadStatus.contacted).length).toBeGreaterThan(0);
  expect(
    screen.getByText(t.common.showing.replace('{shown}', '2').replace('{total}', '2')),
  ).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/leads?page=1&pageSize=25');
});

test('a status pill filters server-side and only the selected pill carries the API total', async () => {
  mockApiFetch.mockResolvedValue(page([huda], 7));
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('هدى سالم');
  expect(screen.getByRole('tab', { name: `${t.leads.filterAll} 7` })).toBeTruthy();

  await fireEvent.press(screen.getByRole('tab', { name: t.enums.leadStatus.new }));
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenLastCalledWith('/leads?status=new&page=1&pageSize=25'),
  );
  expect(await screen.findByRole('tab', { name: `${t.enums.leadStatus.new} 7` })).toBeTruthy();
  expect(screen.getByRole('tab', { name: t.leads.filterAll })).toBeTruthy();
});

test('search sends q to the API', async () => {
  mockApiFetch.mockResolvedValue(page([huda]));
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('هدى سالم');
  const field = screen.getByLabelText(t.leads.searchPlaceholder);
  await fireEvent.changeText(field, ' هدى ');
  await fireEvent(field, 'submitEditing');
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenLastCalledWith(
      `/leads?q=${encodeURIComponent('هدى')}&page=1&pageSize=25`,
    ),
  );
});

test('a row opens the lead screen', async () => {
  mockApiFetch.mockResolvedValue(page([huda]));
  await renderWithQuery(<InboxScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: /هدى سالم/ }));
  expect(mockPush).toHaveBeenCalledWith('/inbox/a1');
});

test('nothing found: the inbox empty state', async () => {
  mockApiFetch.mockResolvedValue(page([]));
  await renderWithQuery(<InboxScreen />);
  expect(await screen.findByRole('header', { name: t.leads.empty })).toBeTruthy();
});

test('failed with nothing saved: error and retry', async () => {
  mockApiFetch.mockRejectedValueOnce(new ApiError(500)).mockResolvedValue(page([huda]));
  await renderWithQuery(<InboxScreen />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('هدى سالم')).toBeTruthy();
});

test('offline with a saved list: rows stay, no error, and «آخر تحديث» says how old', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(503));
  const client = createTestQueryClient();
  client.setQueryData(listKey('/leads', { q: '' }), cachedList([huda]));
  await renderWithQuery(<InboxScreen />, client);
  expect(screen.getByText('هدى سالم')).toBeTruthy();
  expect(
    await screen.findByText(new RegExp(t.mobile.lastUpdated.replace(' {time}', ''))),
  ).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});
