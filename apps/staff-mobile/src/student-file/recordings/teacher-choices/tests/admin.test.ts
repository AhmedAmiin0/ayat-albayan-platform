import type { StudentRecordingView } from '@ab/schedule';
import { teacherOptionFixture } from '@ab/shared/testing';
import { renderHook, waitFor } from '@testing-library/react-native';
import { studentKeys } from '@/core/lib/keys';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import type { TeacherChoice } from '@/student-file/recordings/RecordingFiltersBar';
import { useTeacherChoices } from '@/student-file/recordings/teacher-choices/teacher-choices';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const renderChoices = (client = createTestQueryClient()) =>
  renderHook<TeacherChoice[], { rows: StudentRecordingView[] }>(
    ({ rows }) => useTeacherChoices(rows, true),
    { initialProps: { rows: [] }, wrapper: queryWrapper(client) },
  );

test('an admin chooses among every teacher of GET /students/teacher-options', async () => {
  mockApiFetch.mockResolvedValue([teacherOptionFixture({ id: 't1', display_name_ar: 'أبرار' })]);
  const { result } = await renderChoices();
  await waitFor(() => expect(result.current).toEqual([{ id: 't1', name: 'أبرار' }]));
  expect(mockApiFetch).toHaveBeenCalledWith('/students/teacher-options');
});

test('options that break the route answer are refused, so no teacher is offered', async () => {
  mockApiFetch.mockResolvedValue([{ id: 't1', display_name_ar: 'أبرار' }]);
  const client = createTestQueryClient();
  const { result } = await renderChoices(client);
  const options = () => client.getQueryState(studentKeys.teacherOptions());
  await waitFor(() => expect(['success', 'error']).toContain(options()?.status));
  expect(result.current).toEqual([]);
});
