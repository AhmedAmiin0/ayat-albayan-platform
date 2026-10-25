import type { ThreadView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { thread } from './thread-fixtures';
import { ThreadModeProvider } from './thread/hooks/thread-mode';
import { ThreadsList } from './ThreadsList';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: string) => mockPush(h) } }));

// What the API answers a teacher (teacher mode): her student's guardian, lead fields nulled.
const guardian: ThreadView = {
  ...thread,
  display_name: 'أم يوسف',
  guardian_id: 'g-1',
  guardian_name: 'أم يوسف',
  lead_id: null,
  lead_name: null,
  lead_status: null,
  lead_source: null,
  unread_count: 2,
};

function renderAs(teacher: boolean) {
  const mode = teacher ? ({ kind: 'teacher', teacherId: 't-abrar' } as const) : ({ kind: 'admin' } as const);
  return renderWithQuery(
    <ThreadModeProvider value={mode}>
      <ThreadsList />
    </ThreadModeProvider>,
  );
}

beforeEach(() => {
  mockPush.mockReset();
  mockApiFetch.mockResolvedValue({ items: [guardian], total: 1, page: 1, pageSize: 25 });
});

test('teacher mode: her threads with their unread count, no tags, rows open /teacher/chats', async () => {
  await renderAs(true);
  await fireEvent.press(await screen.findByText('أم يوسف'));
  expect(mockPush).toHaveBeenCalledWith('/teacher/chats/%2B966552147730');
  expect(screen.queryByText(t.inbox.kind.guardian)).toBeNull();
  expect(screen.getByText(t.inbox.unread.two)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/threads?page=1&pageSize=25');
});

test('admin mode keeps the tags and the admin thread route', async () => {
  await renderAs(false);
  await fireEvent.press(await screen.findByText('أم يوسف'));
  expect(mockPush).toHaveBeenCalledWith('/inbox/thread/%2B966552147730');
  expect(screen.getByText(t.inbox.kind.guardian)).toBeTruthy();
});
