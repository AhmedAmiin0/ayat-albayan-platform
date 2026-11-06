import { anchoredThreadPrefix } from '@ab/client-core';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Pressable as MockPressable, Text as MockText } from 'react-native';
import { createTestQueryClient, renderWithQuery, seedPublicConfig } from '@/test/query';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { ReplyActionsProvider, ReplyNoteLine } from './index';

// docs/37 review correction 1: a reply action taken inside the window around an old search hit
// refreshes that window too, not only the live chat.

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockGet(p),
  apiSend: (...a: unknown[]) => mockPost(...a),
}));
jest.mock('@/teaching', () => ({
  ...jest.requireActual('@/teaching'),
  RescheduleSheet: ({ onDone }: { onDone: () => void }) => (
    <MockPressable accessibilityRole="button" onPress={onDone}>
      <MockText>moved</MockText>
    </MockPressable>
  ),
}));

const NEXT = {
  id: 'l-9',
  starts_at: '2099-10-04T14:00:00Z',
  ends_at: '2099-10-04T15:00:00Z',
  status: 'scheduled' as const,
  meeting_link: null,
  student_names: ['ياسين'],
  tz: 'Asia/Riyadh',
};

async function note(body: string) {
  const client = createTestQueryClient();
  seedPublicConfig(client, { lesson_confirmation_required: true });
  const spy = jest.spyOn(client, 'invalidateQueries');
  const m = message({ id: 'm-a', direction: 'inbound', body, guardian_id: 'g-1' });
  await renderWithQuery(
    <ReplyActionsProvider phone={PHONE} lessons={[NEXT]}>
      <ReplyNoteLine message={m} />
    </ReplyActionsProvider>,
    client,
  );
  return () => spy.mock.calls.map(([f]) => f?.queryKey);
}

beforeEach(() => jest.clearAllMocks());

test('ReplyConfirmButton: «تأكيد الحلقة» refreshes the anchored window', async () => {
  mockPost.mockResolvedValue({ id: 'l-9', status: 'confirmed' });
  const keys = await note('ايوة');
  await fireEvent.press(screen.getByRole('button', { name: /^تأكيد حلقة/ }));
  await waitFor(() => expect(keys()).toContainEqual([...anchoredThreadPrefix(PHONE)]));
});

test('ReplyActionsProvider: a moved lesson refreshes the anchored window', async () => {
  mockGet.mockResolvedValue([{ id: 'l-9' }]);
  const keys = await note('تأجيل الحلقة إلى غدا');
  await fireEvent.press(screen.getByRole('button', { name: /^تغيير موعد حلقة/ }));
  await fireEvent.press(await screen.findByText('moved'));
  await waitFor(() => expect(keys()).toContainEqual([...anchoredThreadPrefix(PHONE)]));
});
