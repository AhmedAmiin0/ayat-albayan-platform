import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { LeadReclassify } from './LeadReclassify';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));

beforeEach(() => {
  mockApiSend.mockReset();
  mockBack.mockReset();
});

async function ask() {
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await renderWithQuery(<LeadReclassify id="a1" />, client);
  await fireEvent.press(screen.getByRole('button', { name: t.leads.reclassifyAsApplicant }));
  return { invalidate };
}

test('asks first, in today’s words', async () => {
  await ask();
  expect(screen.getByText(t.leads.reclassifyConfirm)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.leads.keepHere })).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('«أبقِها هنا» closes the question without a request', async () => {
  await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.leads.keepHere }));
  expect(screen.queryByText(t.leads.reclassifyConfirm)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('confirm: POST reclassify, pop back, refetch every lead list', async () => {
  mockApiSend.mockResolvedValue({ id: 'j1' });
  const { invalidate } = await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.leads.reclassifyAsApplicant }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/leads/a1/reclassify');
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leads'] });
});

test('a failed move stays on the screen with the error', async () => {
  mockApiSend.mockRejectedValue(new ApiError(500));
  await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.leads.reclassifyAsApplicant }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
  expect(screen.getByText(t.leads.reclassifyConfirm)).toBeTruthy();
});
