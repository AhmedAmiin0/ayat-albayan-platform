import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { huda } from '../shared/fixtures';
import { LeadAssign } from './LeadAssign';
import { free, leadsBackend, owned } from './leads-fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(leadsBackend(['leads.assign']));
  mockApiSend.mockReset();
});

test('the current owner is the chosen pill; the people come from GET /sales/people', async () => {
  await renderWithQuery(<LeadAssign lead={owned} />);
  expect(await screen.findByRole('radio', { name: 'عمر' })).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'سارة', checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.sales.assign.none })).toBeTruthy();
});

test('picking a person POSTs profileId, patches the detail and refetches the lists', async () => {
  mockApiSend.mockResolvedValue({});
  const client = createTestQueryClient();
  client.setQueryData(['leads', free.id], free);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await renderWithQuery(<LeadAssign lead={free} />, client);
  await fireEvent.press(await screen.findByRole('radio', { name: 'عمر' }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', `/leads/${free.id}/assign`, { profileId: 'p2' });
  await waitFor(() => expect(client.getQueryData(['leads', free.id])).toMatchObject({ assigned_to: 'p2', assigned_to_name: 'عمر' }));
  expect(await screen.findByText(t.mobileLeads.assignRowSaved)).toBeTruthy();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leads', 'list'] });
});

test('«بدون مسؤول» takes the lead back with profileId null', async () => {
  mockApiSend.mockResolvedValue({});
  await renderWithQuery(<LeadAssign lead={owned} />);
  await screen.findByRole('radio', { name: 'عمر' });
  await fireEvent.press(screen.getByRole('radio', { name: t.sales.assign.none }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', `/leads/${owned.id}/assign`, { profileId: null });
});

test('a refused assignment shows the error', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'not_a_salesperson' }));
  await renderWithQuery(<LeadAssign lead={free} />);
  await fireEvent.press(await screen.findByRole('radio', { name: 'سارة' }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});

test('an owner the list no longer has still shows by the name the API sent', async () => {
  await renderWithQuery(<LeadAssign lead={{ ...huda, assigned_to: 'gone', assigned_to_name: 'منى' }} />);
  expect(await screen.findByRole('radio', { name: 'منى', checked: true })).toBeTruthy();
});

test('the people list failing offers a retry; no leads.assign renders nothing', async () => {
  mockApiFetch.mockImplementation((path: string) =>
    path === '/auth/me' ? Promise.resolve({ permissions: ['leads.assign'] }) : Promise.reject(new Error('offline')),
  );
  const first = await renderWithQuery(<LeadAssign lead={free} />);
  expect(await screen.findByText(t.mobileLeads.peopleFailed)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.mobile.retry })).toBeTruthy();
  first.unmount();
  mockApiFetch.mockImplementation(leadsBackend(['leads.read']));
  await renderWithQuery(<LeadAssign lead={free} />);
  await waitFor(() => expect(screen.queryByText(t.mobileLeads.assignTitle)).toBeNull());
});
