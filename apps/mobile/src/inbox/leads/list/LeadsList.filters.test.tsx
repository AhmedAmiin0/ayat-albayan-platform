import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { LeadsList } from './LeadsList';
import { leadsBackend } from './leads-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const leadsCalls = () => mockApiFetch.mock.calls.map((c) => String(c[0])).filter((p) => p.startsWith('/leads'));
const lastLeadsCall = () => leadsCalls()[leadsCalls().length - 1] ?? '';

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(leadsBackend(['leads.assign']));
});

test('the row names its sales owner, an unassigned lead names none', async () => {
  await renderWithQuery(<LeadsList switcher={null} />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(new RegExp(t.mobileLeads.assignedTo.replace('{name}', 'سارة')))).toBeTruthy();
  expect(screen.queryAllByText(new RegExp(t.mobileLeads.assignedTo.replace('{name}', '')))).toHaveLength(1);
});

test('source, owner and order go to GET /leads as the web sends them', async () => {
  await renderWithQuery(<LeadsList switcher={null} />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText('هدى سالم');
  await fireEvent.press(screen.getByRole('button', { name: t.mobileLeads.filter }));
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.leadSource.facebook_ad }));
  await waitFor(() => expect(lastLeadsCall()).toContain('source=facebook_ad'));
  await fireEvent.press(await screen.findByRole('radio', { name: 'سارة' }));
  await waitFor(() => expect(lastLeadsCall()).toContain('assignee=p1'));
  await fireEvent.press(screen.getByRole('radio', { name: t.leads.sort.newest }));
  await waitFor(() => expect(lastLeadsCall()).toMatch(/sort=created_at&dir=desc|dir=desc&sort=created_at/));
  expect(screen.getByRole('button', { name: t.mobileLeads.filterCount.replace('{n}', '3') })).toBeTruthy();
});

test('«بدون مسؤول» asks for assignee=none and «مسح التصفية» drops every filter', async () => {
  await renderWithQuery(<LeadsList switcher={null} />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText('هدى سالم');
  await fireEvent.press(screen.getByRole('button', { name: t.mobileLeads.filter }));
  await fireEvent.press(screen.getByRole('radio', { name: t.sales.assign.none }));
  await waitFor(() => expect(lastLeadsCall()).toContain('assignee=none'));
  await fireEvent.press(screen.getByRole('button', { name: t.mobileLeads.clearFilters }));
  await waitFor(() => expect(lastLeadsCall()).not.toContain('assignee'));
});

test('the result button carries the total the API returned', async () => {
  await renderWithQuery(<LeadsList switcher={null} />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText('هدى سالم');
  await fireEvent.press(screen.getByRole('button', { name: t.mobileLeads.filter }));
  expect(screen.getByRole('button', { name: t.mobileLeads.showResults.replace('{n}', '2') })).toBeTruthy();
});

test('a role without leads.assign gets no bulk button and no salespeople to filter by', async () => {
  mockApiFetch.mockImplementation(leadsBackend(['leads.read']));
  await renderWithQuery(<LeadsList switcher={null} />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText('هدى سالم');
  await waitFor(() => expect(screen.queryByRole('button', { name: t.sales.assign.assignAll })).toBeNull());
  await fireEvent.press(screen.getByRole('button', { name: t.mobileLeads.filter }));
  expect(screen.getByRole('radio', { name: t.sales.assign.none })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: 'سارة' })).toBeNull();
});

test('a filter with no results says «no match»; an empty inbox without filters says «no leads»', async () => {
  mockApiFetch.mockImplementation(leadsBackend(['leads.assign'], []));
  await renderWithQuery(<LeadsList switcher={null} />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByRole('header', { name: t.leads.empty })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileLeads.filter }));
  await fireEvent.press(screen.getByRole('radio', { name: t.sales.assign.none }));
  expect(await screen.findByRole('header', { name: t.mobileLeads.noMatch })).toBeTruthy();
});

test('the compact top: «تصفية» is a pill in the status row, the bulk assignment waits in the sheet', async () => {
  await renderWithQuery(<LeadsList switcher={null} />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText('هدى سالم');
  expect(screen.queryByRole('button', { name: t.sales.assign.assignAll })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileLeads.filter }));
  expect(screen.getByRole('button', { name: t.sales.assign.assignAll })).toBeTruthy();
});
