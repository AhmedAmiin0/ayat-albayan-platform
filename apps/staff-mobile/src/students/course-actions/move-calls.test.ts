import { SUB_ID } from '@/sales-course/testing/fixtures';
import { teacherChangeCalls, timesChangeCalls } from './move-calls';

const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const STUDENT = '0b6a7c1e-2222-4a8e-9b00-000000000002';
const TEACHER = '1a000000-0000-4000-8000-000000000002';
const body = {
  subscriptionId: SUB_ID,
  byday: [1, 3],
  startTimeLocal: '18:00',
  startsOn: '2026-10-05',
  startsAt: '2026-10-05T15:00:00.000Z',
  clientRequestId: '00000000-0000-4000-8000-000000000001',
};
const check = { conflicts: [], remaining: 5, endsOn: '2026-10-21' };
const saved = { subscriptionId: SUB_ID, ruleIds: [SUB_ID], endsOn: '2026-10-21' };

afterEach(() => mockApiSend.mockReset());

test('new times are checked and saved on the student course-times routes', async () => {
  mockApiSend.mockResolvedValueOnce(check).mockResolvedValueOnce(saved);
  const calls = timesChangeCalls(STUDENT);
  await expect(calls.check(body)).resolves.toEqual(check);
  const path = `/students/${STUDENT}/course-times/change`;
  expect(mockApiSend).toHaveBeenLastCalledWith('POST', `${path}/check`, body);
  await expect(calls.change(body)).resolves.toEqual(saved);
  expect(mockApiSend).toHaveBeenLastCalledWith('POST', path, body);
});

test('a teacher move sends the new teacher with the check and the change', async () => {
  mockApiSend.mockResolvedValueOnce(check).mockResolvedValueOnce(saved);
  const calls = teacherChangeCalls(STUDENT, TEACHER);
  const path = `/students/${STUDENT}/course-teacher/change`;
  await calls.check(body);
  expect(mockApiSend).toHaveBeenLastCalledWith('POST', `${path}/check`, { ...body, teacherId: TEACHER });
  await calls.change(body);
  expect(mockApiSend).toHaveBeenLastCalledWith('POST', path, { ...body, teacherId: TEACHER });
});

test('the two tables and two teachers never share a cached check', () => {
  const keys = [
    timesChangeCalls(STUDENT).key,
    teacherChangeCalls(STUDENT, TEACHER).key,
    teacherChangeCalls(STUDENT, SUB_ID).key,
  ];
  expect(new Set(keys).size).toBe(3);
});
