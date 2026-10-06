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

const guardian = { phone_e164: PHONE, guardian_id: 'g1' };
const rating = (status: TemplateView['status']): TemplateView => ({ ...meetReminder, key: 'lesson_rating', status });
const send = () => screen.findByRole('button', { name: t.inbox.rating.send });

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue([rating('approved')]);
  mockApiSend.mockReset();
});

test('POSTs /threads/:phone/rating with one request id, kept across a failed retry', async () => {
  mockApiSend.mockRejectedValueOnce(new ApiError(500)).mockResolvedValue(message({ id: 'm9', status: 'sent' }));
  await renderWithQuery(<SendRating thread={guardian} />);
  await waitFor(async () => expect((await send()).props.accessibilityState?.disabled).not.toBe(true));
  await fireEvent.press(await send());
  expect(await screen.findByText(t.inbox.rating.failed)).toBeTruthy();
  await fireEvent.press(await send());
  expect(await screen.findByText(t.inbox.rating.sent)).toBeTruthy();
  const [method, path, body] = mockApiSend.mock.calls[0] ?? [];
  expect([method, path]).toEqual(['POST', `/threads/${encodeURIComponent(PHONE)}/rating`]);
  expect(mockApiSend.mock.calls[1]?.[2]).toEqual(body);
});

test('a queued send says it waits for the send gate and refetches the threads', async () => {
  mockApiSend.mockResolvedValue(message({ id: 'm9', status: 'queued' }));
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await renderWithQuery(<SendRating thread={guardian} />, client);
  await waitFor(async () => expect((await send()).props.accessibilityState?.disabled).not.toBe(true));
  await fireEvent.press(await send());
  expect(await screen.findByText(t.inbox.rating.queued)).toBeTruthy();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['threads'] });
});

test('until Meta approves the template the button is off and says why', async () => {
  mockApiFetch.mockResolvedValue([rating('pending')]);
  await renderWithQuery(<SendRating thread={guardian} />);
  expect(await screen.findByText(t.inbox.rating.notApproved)).toBeTruthy();
  await fireEvent.press(await send());
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a refusal from the API is shown in the web words', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'no_completed_lesson' }));
  await renderWithQuery(<SendRating thread={guardian} />);
  await waitFor(async () => expect((await send()).props.accessibilityState?.disabled).not.toBe(true));
  await fireEvent.press(await send());
  expect(await screen.findByText(t.inbox.rating.noLesson)).toBeTruthy();
});

test('a thread that is not a guardian’s has no button and asks nothing', async () => {
  await renderWithQuery(<SendRating thread={{ phone_e164: PHONE, guardian_id: null }} />);
  expect(screen.queryByRole('button', { name: t.inbox.rating.send })).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalled();
});
