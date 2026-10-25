import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { AssistantLessonsList } from './AssistantLessonsList';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiSend: jest.fn(),
}));

afterEach(() => jest.useRealTimers());
const day = { from: '2026-09-30T21:00:00.000Z', to: '2026-10-01T21:00:00.000Z' };
const row = (over: object) => ({
  lesson_id: 'l1',
  starts_at: '2026-10-01T13:00:00.000Z',
  ends_at: '2026-10-01T13:45:00.000Z',
  status: 'confirmed',
  teacher_name: 'أبرار',
  student_names: ['يوسف', 'جنى'],
  ...over,
});

test('lists the open sessions with students, teacher and «ادخل الحلقة»; cancelled ones are left out', async () => {
  fakeNow(new Date('2026-10-01T13:10:00Z'));
  mockApiFetch.mockResolvedValue([row({}), row({ lesson_id: 'l2', status: 'cancelled_by_admin' })]);
  await renderWithQuery(<AssistantLessonsList day={day} />);
  expect(await screen.findByText(`${t.classroom.assistants.student} يوسف، جنى`)).toBeTruthy();
  expect(screen.getByText(`${t.classroom.assistants.teacher} أبرار`)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(1);
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/assistants/me/lessons?from='));
});

test('no open session shows the empty state; a failed read shows the error', async () => {
  mockApiFetch.mockResolvedValue([]);
  const first = await renderWithQuery(<AssistantLessonsList day={day} />);
  expect(await screen.findByText(t.classroom.assistants.homeEmpty)).toBeTruthy();
  await first.unmount();
  mockApiFetch.mockRejectedValue(new Error('x'));
  await renderWithQuery(<AssistantLessonsList day={{ ...day, from: '2026-10-02T00:00:00.000Z' }} />);
  expect(await screen.findByRole('alert')).toBeTruthy();
});
