import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { LessonRecording } from '@/recordings/LessonRecording';

const mockSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue({ url: 'https://files.example/a', expires_at: 'x' });
});

test('a part: its title, then the in-app player from a fresh recording link', async () => {
  const title = t.lessonFiles.part.replace('{n}', '2');
  await renderWithQuery(
    <LessonRecording studentId="s1" recordingId="A" title={title} />,
    freshQueryClient(),
  );
  expect(screen.getByText(title)).toBeTruthy();
  expect(await screen.findByRole('button', { name: t.audioPlayer.play })).toBeTruthy();
  expect(mockSend).toHaveBeenCalledWith('POST', '/portal/students/s1/recordings/A/url', undefined);
});

test('no title: the section is named the lesson recording', async () => {
  await renderWithQuery(
    <LessonRecording studentId="s1" recordingId="A" title="" />,
    freshQueryClient(),
  );
  expect(screen.getByText(t.lessonFiles.recording)).toBeTruthy();
});
