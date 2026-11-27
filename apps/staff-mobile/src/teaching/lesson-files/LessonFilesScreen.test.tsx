import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { LessonFilesScreen } from './LessonFilesScreen';

const F = t.lessonFiles;
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canDismiss: () => true },
  useLocalSearchParams: () => ({ id: 'l1' }),
}));

const file = {
  id: 'f1', lesson_id: 'l1', kind: 'homework', title: 'ورقة الواجب', mime: 'image/png', size: 900,
  media: 'image', visible_to_family: true, created_at: '2026-11-16T17:00:00.000Z',
};
interface Student {
  id: string;
  name: string;
  code: string | null;
}
const assets = (students: Student[] = [{ id: 's1', name: 'سلمى', code: 'AB-0001' }]) => ({
  lesson_id: 'l1', starts_at: '2026-11-16T16:00:00.000Z', ends_at: '2026-11-16T16:45:00.000Z', students,
  recordings: [{
    id: 'r1', status: 'done', duration_seconds: 2530, size_bytes: 19_000_000, media: 'audio',
    started_at: '2026-11-16T16:00:00.000Z', ended_at: '2026-11-16T16:42:10.000Z',
    visible_to_student: false, url: 'https://files.example/r.mp3',
  }],
  reports: [], files: [file],
});

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(assets());
  mockApiSend.mockReset().mockResolvedValue({ ...file, visible_to_family: false });
});

test('the recording, the files, and the three pickers', async () => {
  await renderWithQuery(<LessonFilesScreen />);
  expect(await screen.findByText('ورقة الواجب')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/lessons/l1/files');
  expect(screen.getByRole('button', { name: F.sources.camera })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.audioPlayer.play })).toBeTruthy();
});

test('shows the recording to the family; hides a file from it', async () => {
  await renderWithQuery(<LessonFilesScreen />);
  const [recording, firstFile] = await screen.findAllByRole('switch', { name: F.visible });
  if (!recording || !firstFile) throw new Error('two switches expected');
  await fireEvent(recording, 'valueChange', true);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/recordings/r1/visibility', { visible: true }));
  await fireEvent(firstFile, 'valueChange', false);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/lesson-files/f1/visibility', { visible: false }));
});

test('a group lesson’s recording stays hidden, with the reason', async () => {
  mockApiFetch.mockResolvedValue(assets([
    { id: 's1', name: 'سلمى', code: null }, { id: 's2', name: 'يوسف', code: null },
  ]));
  await renderWithQuery(<LessonFilesScreen />);
  expect(await screen.findByText(t.studentRecordings.visible.groupLesson)).toBeTruthy();
});

test('«أزل الملف» asks once more before the file goes', async () => {
  await renderWithQuery(<LessonFilesScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: F.remove }));
  expect(mockApiSend).not.toHaveBeenCalledWith('DELETE', '/lesson-files/f1');
  expect(screen.getByText(`${F.removeConfirm} ${F.removeConfirmBody}`)).toBeTruthy();
  const [, confirm] = screen.getAllByRole('button', { name: F.remove });
  await fireEvent.press(confirm ?? screen.getByRole('button', { name: F.remove }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('DELETE', '/lesson-files/f1', undefined),
  );
});
