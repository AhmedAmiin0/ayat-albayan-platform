import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { selfPermissionsOf, type Permission, type ThreadLesson } from '@ab/shared';
import { Pressable, Text } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { message, PHONE } from '../../shared/thread-fixtures';
import { ReplyActionsProvider, ReplyNoteLine } from './index';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
// The sheets are their own features' (Reschedule / SalesReschedule tests): here, which one opens on which lesson.
function mockSheet(who: string) {
  return function Sheet(p: { lesson: { id: string } | null; onDone: () => void }) {
    return (
      <Pressable accessibilityRole="button" onPress={p.onDone}>
        <Text>{`${who} ${p.lesson?.id ?? ''}`}</Text>
      </Pressable>
    );
  };
}
jest.mock('@/teaching', () => ({ ...jest.requireActual('@/teaching'), RescheduleSheet: mockSheet('admin') }));
jest.mock('@/sales', () => ({ ...jest.requireActual('@/sales'), SalesRescheduleSheet: mockSheet('sales') }));

const LESSON: ThreadLesson = {
  id: 'l-1',
  starts_at: '2099-10-04T14:00:00Z',
  ends_at: '2099-10-04T15:00:00Z',
  status: 'scheduled',
  meeting_link: null,
  student_names: ['ياسين'],
  tz: 'Asia/Riyadh',
};
const ASK = message({ id: 'm-r', direction: 'inbound', body: 'تأجيل الحلقة إلى غدا', guardian_id: 'g-1' });
const YES = message({ id: 'm-y', direction: 'inbound', body: 'ايوة', guardian_id: 'g-1' });
const NO = 'لم تتأكد أي حلقة بهذا الرد';
const SALES: Permission[] = [...selfPermissionsOf('sales'), 'lessons.reschedule', 'lessons.confirm'];

async function renderNote(m: typeof ASK, permissions?: Permission[]) {
  const client = createTestQueryClient();
  if (permissions) client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions });
  await renderWithQuery(
    <ReplyActionsProvider phone={PHONE} lessons={[LESSON]}>
      <ReplyNoteLine message={m} />
    </ReplyActionsProvider>,
    client,
  );
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('«تأجيل الحلقة», admin: «تغيير الموعد» opens the admin sheet on the family’s next lesson; then the note says it moved', async () => {
  mockApiFetch.mockResolvedValue([{ id: 'l-1' }]);
  await renderNote(ASK);
  expect(screen.getByText(t.inbox.quickReply.reschedule)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /^تغيير موعد حلقة/ }));
  await fireEvent.press(await screen.findByText('admin l-1'));
  expect(mockApiFetch).toHaveBeenCalledWith('/lessons?from=2099-10-04T14%3A00%3A00.000Z&to=2099-10-04T14%3A01%3A00.000Z');
  expect(await screen.findByText(t.inbox.quickReply.rescheduled)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^تغيير موعد حلقة/ })).toBeNull();
});

test('«تأجيل الحلقة», sales: her one-lesson sheet, the lesson read from that Riyadh day', async () => {
  mockApiFetch.mockResolvedValue({ date: '2099-10-04', lessons: [{ id: 'l-1' }] });
  await renderNote(ASK, SALES);
  await fireEvent.press(screen.getByRole('button', { name: /^تغيير موعد حلقة/ }));
  expect(await screen.findByText('sales l-1')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/schedule?date=2099-10-04');
});

test('no right to move: «طلب تغيير الموعد» and no button', async () => {
  await renderNote(ASK, ['lessons.confirm']);
  expect(screen.getByText(t.inbox.quickReply.rescheduleNoLesson)).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

test('«ايوة»: «تأكيد الحلقة» on its scheduled lesson, never «no lesson was confirmed»', async () => {
  mockApiSend.mockResolvedValue({ id: 'l-1', status: 'confirmed' });
  await renderNote(YES, SALES);
  expect(screen.queryByText(NO)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /^تأكيد حلقة/ }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-1/confirm'));
});

test('«ايوة» without the right to confirm: nothing at all', async () => {
  await renderNote(YES, ['lessons.reschedule']);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByText(NO)).toBeNull();
  expect(screen.queryByText(t.inbox.replyAction.confirm)).toBeNull();
});
