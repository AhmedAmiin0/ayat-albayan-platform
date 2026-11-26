import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { LessonFiles } from '@/recordings/LessonFiles';
import { lessonPage } from '@/recordings/recordings.fixtures';

const mockSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));

const F = t.lessonFiles;
const files = lessonPage().files;
const show = () =>
  renderWithQuery(<LessonFiles studentId="s1" reportId="r-L1" files={files} />, freshQueryClient());

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue({ url: 'https://files.example/x', expires_at: 'x' });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

test('the header counts the report PDF with the files; the PDF opens from a fresh link', async () => {
  await show();
  expect(screen.getByText(F.header.replace('{n}', '3'))).toBeTruthy();
  await fireEvent.press(screen.getByText(F.reportPdf));
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://files.example/x'));
  expect(mockSend).toHaveBeenCalledWith('POST', '/portal/students/s1/reports/r-L1/url');
});

test('a picture opens from its own link', async () => {
  await show();
  await fireEvent.press(screen.getByText('صفحة الواجب'));
  await waitFor(() =>
    expect(mockSend).toHaveBeenCalledWith('POST', '/portal/students/s1/lesson-files/f1/url'));
});

test('a file that fails to open: the error line', async () => {
  mockSend.mockRejectedValue(new Error('down'));
  await show();
  expect(screen.queryByText(F.fileFailed)).toBeNull();
  await fireEvent.press(screen.getByText('صفحة الواجب'));
  expect(await screen.findByText(F.fileFailed)).toBeTruthy();
});
