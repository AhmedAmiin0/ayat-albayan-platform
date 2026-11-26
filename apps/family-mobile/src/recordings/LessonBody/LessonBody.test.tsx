import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { LessonBody } from '@/recordings/LessonBody';
import { lessonPage, rec } from '@/recordings/recordings.fixtures';

const mockSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(() => new Promise(() => undefined)),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));

const F = t.lessonFiles;
const part = (n: number) => F.part.replace('{n}', String(n));

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue({ url: 'https://files.example/x', expires_at: 'x' });
});

test('one recording: titled the lesson recording, then the report and the files', async () => {
  await renderWithQuery(<LessonBody view={lessonPage()} studentId="s1" />, freshQueryClient());
  expect(screen.getByText(F.recording)).toBeTruthy();
  expect(screen.queryByText(part(1))).toBeNull();
  expect(screen.getByText(F.report)).toBeTruthy();
  expect(screen.getByText(F.reportPdf)).toBeTruthy();
});

test('two parts, newest first from the api: the oldest plays first as part 1', async () => {
  const view = { ...lessonPage(), recordings: [rec('B', 'L1'), rec('A', 'L1')] };
  await renderWithQuery(<LessonBody view={view} studentId="s1" />, freshQueryClient());
  expect(screen.getByText(part(1))).toBeTruthy();
  expect(screen.getByText(part(2))).toBeTruthy();
  const asked = mockSend.mock.calls.map(([, path]: unknown[]) => path);
  expect(asked.slice(0, 2)).toEqual([
    '/portal/students/s1/recordings/A/url',
    '/portal/students/s1/recordings/B/url',
  ]);
});

test('no report yet: the report pdf asks for no report id', async () => {
  const view = { ...lessonPage(), report_id: null };
  await renderWithQuery(<LessonBody view={view} studentId="s1" />, freshQueryClient());
  expect(screen.getByText(F.report)).toBeTruthy();
  expect(screen.getByText(F.reportPdf)).toBeTruthy();
});
