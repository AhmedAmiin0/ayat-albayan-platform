import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { AssignUnassigned } from './AssignUnassigned';

const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

beforeEach(() => mockApiSend.mockReset());

const ask = () => fireEvent.press(screen.getByRole('button', { name: t.sales.assign.assignAll }));

test('asks first: nothing is sent until the confirm', async () => {
  await renderWithQuery(<AssignUnassigned />);
  await ask();
  expect(screen.getByText(t.mobileLeads.assignAllConfirm)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByText(t.mobileLeads.assignAllConfirm)).toBeNull();
});

test('confirm: POST assign-unassigned, say how many, refetch leads and salespeople', async () => {
  mockApiSend.mockResolvedValue({ assigned: 4 });
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await renderWithQuery(<AssignUnassigned />, client);
  await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.sales.assign.assignAll }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/leads/assign-unassigned'));
  expect(await screen.findByText(t.sales.assign.assignedN.replace('{n}', '4'))).toBeTruthy();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leads'] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sales', 'people'] });
});

test('nothing to assign says so; a failure keeps the question open with the error', async () => {
  mockApiSend.mockResolvedValueOnce({ assigned: 0 }).mockRejectedValueOnce(new ApiError(500));
  await renderWithQuery(<AssignUnassigned />);
  await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.sales.assign.assignAll }));
  expect(await screen.findByText(t.mobileLeads.assignAllNone)).toBeTruthy();
  await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.sales.assign.assignAll }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.getByText(t.mobileLeads.assignAllConfirm)).toBeTruthy();
});
