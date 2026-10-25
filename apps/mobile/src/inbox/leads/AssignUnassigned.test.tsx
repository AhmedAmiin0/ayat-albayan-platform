import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { AssignUnassigned } from './AssignUnassigned';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

beforeEach(() => mockApiSend.mockReset());

const ask = () => fireEvent.press(screen.getByRole('button', { name: t.sales.assign.assignAll }));

test('asks first: nothing is sent until the confirm', async () => {
  await renderWithQuery(<AssignUnassigned owners={2} />);
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
  await renderWithQuery(<AssignUnassigned owners={2} />, client);
  await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.sales.assign.assignAll }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/leads/assign-unassigned'));
  expect(await screen.findByText(t.sales.assign.assignedN.replace('{n}', '4'))).toBeTruthy();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leads'] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sales', 'people'] });
});

test('nothing to assign says so; a failure keeps the question open with the error', async () => {
  mockApiSend.mockResolvedValueOnce({ assigned: 0 }).mockRejectedValueOnce(new ApiError(500));
  await renderWithQuery(<AssignUnassigned owners={2} />);
  await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.sales.assign.assignAll }));
  expect(await screen.findByText(t.mobileLeads.assignAllNone)).toBeTruthy();
  await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.sales.assign.assignAll }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});

test('0 assigned with no salespeople says so, not «no leads»', async () => {
  mockApiSend.mockResolvedValue({ assigned: 0 });
  await renderWithQuery(<AssignUnassigned owners={0} />);
  await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.sales.assign.assignAll }));
  expect(await screen.findByText(t.mobileLeads.assignNoOwners)).toBeTruthy();
  expect(screen.queryByText(t.mobileLeads.assignAllNone)).toBeNull();
});

test('Cancel does nothing while the request runs; a failed run still refetches the leads', async () => {
  let fail: (e: Error) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((_, reject) => (fail = reject)));
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await renderWithQuery(<AssignUnassigned owners={2} />, client);
  await ask();
  await fireEvent.press(screen.getByRole('button', { name: t.sales.assign.assignAll }));
  // The pending state renders on the next tick: cancel only once the confirm says it is saving.
  await screen.findByRole('button', { name: t.common.saving });
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.getByText(t.mobileLeads.assignAllConfirm)).toBeTruthy();
  fail(new ApiError(504));
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leads'] }));
});
