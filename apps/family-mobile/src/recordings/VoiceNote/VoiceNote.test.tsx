import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { VoiceNote } from '@/recordings/VoiceNote';

const mockSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue({ url: 'https://files.example/v', expires_at: 'x' });
});

test('a voice note plays in the app from a fresh lesson file link', async () => {
  await renderWithQuery(<VoiceNote studentId="s1" fileId="f2" />, freshQueryClient());
  expect(await screen.findByRole('button', { name: t.audioPlayer.play })).toBeTruthy();
  const link = '/portal/students/s1/lesson-files/f2/url';
  expect(mockSend).toHaveBeenCalledWith('POST', link, undefined);
});

test('no link yet: no player', async () => {
  mockSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<VoiceNote studentId="s1" fileId="f2" />, freshQueryClient());
  expect(screen.queryByRole('button', { name: t.audioPlayer.play })).toBeNull();
});
