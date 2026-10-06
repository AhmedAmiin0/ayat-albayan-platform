import type { TemplateView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { meetReminder, message, PHONE } from '../thread-fixtures';
import { SendRating } from './SendRating';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const guardian = { phone_e164: PHONE, guardian_id: 'g1', display_name: 'أم يوسف' };
const rating = (status: TemplateView['status']): TemplateView => ({ ...meetReminder, key: 'lesson_rating', status });
const send = () => screen.findByRole('button', { name: t.inbox.rating.send });
const confirmText = t.mobileLeads.ratingConfirm.replace('{name}', 'أم يوسف');
const backend = (permissions: string[], templates: TemplateView[] = [rating('approved')]) =>
  mockApiFetch.mockImplementation(async (path: string) => (path.startsWith('/auth/me') ? { permissions } : templates));

beforeEach(() => {
  backend(['feedback.write']);
  mockApiSend.mockReset();
});

/** Waits until the template is approved, opens the confirm strip. */
async function ask() {
  await waitFor(async () => expect((await send()).props.accessibilityState?.disabled).not.toBe(true));
  await fireEvent.press(await send());
}
const confirm = () => fireEvent.press(screen.getByRole('button', { name: t.inbox.rating.send }));

test('nothing is sent until the confirm, which names the guardian; Cancel closes it', async () => {
  await renderWithQuery(<SendRating thread={guardian} />);
  await ask();
  expect(screen.getByText(confirmText)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByText(confirmText)).toBeNull();
});

test('POSTs /threads/:phone/rating with one request id, kept across a failed retry', async () => {
  mockApiSend.mockRejectedValueOnce(new ApiError(500)).mockResolvedValue(message({ id: 'm9', status: 'sent' }));
  await renderWithQuery(<SendRating thread={guardian} />);
  await ask();
  await confirm();
  expect(await screen.findByText(t.inbox.rating.failed)).toBeTruthy();
  await ask();
  await confirm();
  expect(await screen.findByText(t.inbox.rating.sent)).toBeTruthy();
  const [method, path, body] = mockApiSend.mock.calls[0] ?? [];
  expect([method, path]).toEqual(['POST', `/threads/${encodeURIComponent(PHONE)}/rating`]);
  expect(mockApiSend.mock.calls[1]?.[2]).toEqual(body);
});

test('once it went out the button is off: no second tap, no second request', async () => {
  mockApiSend.mockResolvedValue(message({ id: 'm9', status: 'sent' }));
  await renderWithQuery(<SendRating thread={guardian} />);
  await ask();
  await confirm();
  await screen.findByText(t.inbox.rating.sent);
  expect((await send()).props.accessibilityState?.disabled).toBe(true);
  await fireEvent.press(await send());
  expect(mockApiSend).toHaveBeenCalledTimes(1);
});

test('a queued send says it waits for the send gate and refetches the threads', async () => {
  mockApiSend.mockResolvedValue(message({ id: 'm9', status: 'queued' }));
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await renderWithQuery(<SendRating thread={guardian} />, client);
  await ask();
  await confirm();
  expect(await screen.findByText(t.inbox.rating.queued)).toBeTruthy();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['threads'] });
});

test('a row Meta refused (201, failed) is shown as an error and may be asked again with a new id', async () => {
  mockApiSend.mockResolvedValueOnce(message({ id: 'm9', status: 'failed' })).mockResolvedValue(message({ id: 'm10', status: 'sent' }));
  await renderWithQuery(<SendRating thread={guardian} />);
  await ask();
  await confirm();
  expect(await screen.findByText(t.inbox.rating.failed)).toBeTruthy();
  expect(screen.queryByText(t.inbox.rating.sent)).toBeNull();
  await ask();
  await confirm();
  expect(await screen.findByText(t.inbox.rating.sent)).toBeTruthy();
  expect(mockApiSend.mock.calls[1]?.[2]).not.toEqual(mockApiSend.mock.calls[0]?.[2]);
});

test('until Meta approves the template the button is off and says why', async () => {
  backend(['feedback.write'], [rating('pending')]);
  await renderWithQuery(<SendRating thread={guardian} />);
  expect(await screen.findByText(t.inbox.rating.notApproved)).toBeTruthy();
  await fireEvent.press(await send());
  expect(screen.queryByText(confirmText)).toBeNull();
});

test('the templates failing says so instead of a silent dead button', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/auth/me')) return { permissions: ['feedback.write'] };
    throw new ApiError(403);
  });
  await renderWithQuery(<SendRating thread={guardian} />);
  expect(await screen.findByText(t.mobileLeads.ratingTemplatesFailed)).toBeTruthy();
});

test('a refusal from the API is shown in the web words', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'no_completed_lesson' }));
  await renderWithQuery(<SendRating thread={guardian} />);
  await ask();
  await confirm();
  expect(await screen.findByText(t.inbox.rating.noLesson)).toBeTruthy();
});

test('without feedback.write, or on a thread that is not a guardian’s: no button, no templates call', async () => {
  backend(['leads.read']);
  const first = await renderWithQuery(<SendRating thread={guardian} />);
  await waitFor(() => expect(screen.queryByRole('button', { name: t.inbox.rating.send })).toBeNull());
  first.unmount();
  backend(['feedback.write']);
  mockApiFetch.mockClear();
  await renderWithQuery(<SendRating thread={{ ...guardian, guardian_id: null }} />);
  expect(screen.queryByRole('button', { name: t.inbox.rating.send })).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/messaging/templates');
});
