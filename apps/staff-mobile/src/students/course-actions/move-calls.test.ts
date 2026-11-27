import { SUB_ID } from '@/sales-course/testing/fixtures';
import { ApiError } from '@ab/mobile-kit';
import { serve, stopPreview, SUB } from './fixtures';
import {
  currentSource,
  readCurrentPackage,
  teacherChangeCalls,
  timesChangeCalls,
} from './move-calls';

const mockApiSend = jest.fn();
const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
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

afterEach(() => {
  mockApiSend.mockReset();
  mockApiFetch.mockReset();
});

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
  expect(mockApiSend).toHaveBeenLastCalledWith('POST', `${path}/check`, {
    ...body,
    teacherId: TEACHER,
  });
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

test('the current package is read from the first route the viewer may call', () => {
  expect(currentSource({ stop: true, times: true, teacher: true })).toBe('stop');
  expect(currentSource({ stop: false, times: true, teacher: true })).toBe('times');
  expect(currentSource({ stop: false, times: false, teacher: true })).toBe('teacher');
  expect(currentSource({ stop: false, times: false, teacher: false })).toBeNull();
});

test.each(['stop', 'times', 'teacher'] as const)(
  'the %s route answers the current package without a subscription id',
  async (source) => {
    mockApiFetch.mockImplementation(serve());
    await expect(readCurrentPackage('s1', source)).resolves.toBe(SUB);
    expect(mockApiFetch).toHaveBeenCalledWith(expect.not.stringContaining('subscriptionId'));
  },
);

test('a current package answer the route does not describe fails with bad_response', async () => {
  const { owe: _owe, ...noOwe } = stopPreview();
  mockApiFetch.mockResolvedValue(noOwe);
  const failure = await readCurrentPackage('s1', 'stop').catch((e: unknown) => e);
  expect(failure).toBeInstanceOf(ApiError);
  expect(failure).toMatchObject({ body: { code: 'bad_response' } });
});
