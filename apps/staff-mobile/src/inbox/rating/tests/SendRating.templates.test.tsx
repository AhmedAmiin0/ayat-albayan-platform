import type { TemplateView } from '@ab/shared';
import { screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { meetReminder, PHONE } from '@/inbox/shared/thread-fixtures';
import { SendRating } from '@/inbox/rating/SendRating';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const guardian = { phone_e164: PHONE, guardian_id: 'g1', display_name: 'أم يوسف' };
const approved: TemplateView = { ...meetReminder, key: 'lesson_rating', status: 'approved' };
const answering = (templates: unknown) =>
  mockApiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/auth/me') ? { permissions: ['feedback.write'] } : templates,
  );
const sendButton = () => screen.findByRole('button', { name: t.inbox.rating.send });
type Thread = Parameters<typeof SendRating>[0]['thread'];
const render = (thread: Thread = guardian) =>
  renderWithQuery(<SendRating thread={thread} />, createTestQueryClient({ meFromApi: true }));
const noSend = () =>
  expect(screen.queryByRole('button', { name: t.inbox.rating.send })).toBeNull();

test('the templates are read on GET /messaging/templates and an approved rating enables the send', async () => {
  answering([approved]);
  await render();
  await waitFor(async () =>
    expect((await sendButton()).props.accessibilityState?.disabled).not.toBe(true),
  );
  expect(mockApiFetch).toHaveBeenCalledWith('/messaging/templates');
});

test('a template row that does not fit the template schema never enables the send', async () => {
  answering([{ key: 'lesson_rating', status: 'approved' }]);
  await render();
  const enabled = waitFor(
    async () => expect((await sendButton()).props.accessibilityState?.disabled).not.toBe(true),
    { timeout: 500 },
  );
  await expect(enabled).rejects.toThrow();
  expect(mockApiFetch).toHaveBeenCalledWith('/messaging/templates');
});

test('without feedback.write, or on a thread that is not a guardian’s: no button, no templates call', async () => {
  mockApiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/auth/me') ? { permissions: ['leads.read'] } : [approved],
  );
  const first = await render();
  await waitFor(noSend);
  await first.unmount();
  answering([approved]);
  mockApiFetch.mockClear();
  await render({ ...guardian, guardian_id: null });
  noSend();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/messaging/templates');
});
