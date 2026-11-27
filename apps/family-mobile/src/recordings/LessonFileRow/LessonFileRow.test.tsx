import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { LessonFileRow } from '@/recordings/LessonFileRow';
import { lessonPage } from '@/recordings/recordings.fixtures';

const mockSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));

const [picture, voice] = lessonPage().files;

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue({ url: 'https://files.example/v', expires_at: 'x' });
});

test('a picture: a press hands its id over to open outside, no player', async () => {
  const onOpen = jest.fn();
  if (!picture) throw new Error('fixture');
  await renderWithQuery(
    <LessonFileRow file={picture} studentId="s1" onOpen={onOpen} />,
    freshQueryClient(),
  );
  await fireEvent.press(screen.getByText('صفحة الواجب'));
  expect(onOpen).toHaveBeenCalledWith('f1');
  expect(screen.queryByRole('button', { name: t.audioPlayer.play })).toBeNull();
});

test('a voice note: a press opens the player under it, a second press closes it', async () => {
  const onOpen = jest.fn();
  if (!voice) throw new Error('fixture');
  await renderWithQuery(
    <LessonFileRow file={voice} studentId="s1" onOpen={onOpen} />,
    freshQueryClient(),
  );
  const row = screen.getByText(t.lessonFiles.kinds.voice_note);
  await fireEvent.press(row);
  expect(await screen.findByRole('button', { name: t.audioPlayer.play })).toBeTruthy();
  await fireEvent.press(row);
  expect(screen.queryByRole('button', { name: t.audioPlayer.play })).toBeNull();
  expect(onOpen).not.toHaveBeenCalled();
});
