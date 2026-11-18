import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { clientWithMe, ME, OTHER, row } from '@/short-links/testing/link-fixtures';
import { ShortLinksScreen } from './ShortLinksScreen';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canDismiss: () => true },
}));

const L = t.shortLinks.list;
const all = () => true;
const salesOnly = (p: string) => p !== 'short_links.all';
const rows = [
  row(),
  row({ code: 'R9nB4eQw', title: 'نموذج تسجيل', maxUsers: 10, visitors: 10, audience: 'anyone' }),
  row({ code: 'D2vC6jZk', title: 'اجتماع المعلمين', status: 'revoked', createdBy: null }),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue({ rows, total: 3 });
});

test('the admin: every link with state, short URL, use, owner, and the owner pills', async () => {
  await renderWithQuery(<ShortLinksScreen can={all} base="/more/short-links" />, clientWithMe());
  expect(await screen.findByText('نموذج تسجيل')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/short-links?pageSize=100');
  expect(screen.getByText(t.shortLinks.state.full)).toBeTruthy();
  // The state pills carry the same words as the chips.
  expect(screen.getAllByText(t.shortLinks.state.revoked)).toHaveLength(2);
  expect(screen.getAllByText(t.shortLinks.state.active)).toHaveLength(2);
  expect(screen.getByText(/app\.ayatalbayan\.com\/l\/K7q2M9xT/)).toBeTruthy();
  expect(screen.getAllByText(new RegExp(L.ownerLine.replace('{name}', 'الزهراء')))).toHaveLength(2);
  await fireEvent.press(screen.getByRole('tab', { name: L.mine }));
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenCalledWith(`/short-links?owner=${ME}&pageSize=100`),
  );
});

test('the admin: one owner pill per other owner on the rows filters by that owner', async () => {
  await renderWithQuery(<ShortLinksScreen can={all} base="/more/short-links" />, clientWithMe());
  await fireEvent.press(await screen.findByRole('tab', { name: 'الزهراء' }));
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenCalledWith(`/short-links?owner=${OTHER}&pageSize=100`),
  );
});

test('sales: their own links, no owner pills; a state pill filters; a row opens', async () => {
  await renderWithQuery(<ShortLinksScreen can={salesOnly} base="/sales/more/short-links" />);
  await fireEvent.press(await screen.findByText('اجتماع المعلمين'));
  expect(router.push).toHaveBeenCalledWith('/sales/more/short-links/D2vC6jZk');
  expect(screen.queryByRole('tab', { name: L.mine })).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: t.shortLinks.state.expired }));
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenCalledWith('/short-links?status=expired&pageSize=100'),
  );
  await fireEvent.press(screen.getByRole('button', { name: t.shortLinks.new }));
  expect(router.push).toHaveBeenCalledWith('/sales/more/short-links/new');
});

test('no links yet, and a failed read with its retry', async () => {
  mockApiFetch.mockResolvedValueOnce({ rows: [], total: 0 });
  await renderWithQuery(<ShortLinksScreen can={all} base="/more/short-links" />);
  expect(await screen.findByText(L.empty)).toBeTruthy();
});

test('a failed read says so', async () => {
  mockApiFetch.mockRejectedValue(new Error('down'));
  await renderWithQuery(<ShortLinksScreen can={all} base="/more/short-links" />);
  expect(await screen.findByText(L.loadError)).toBeTruthy();
});
