import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { offPathKeys } from '@ab/client-core';
import { Linking } from 'react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { lessonPage, SARA } from '@/recordings/recordings.fixtures';
import { LessonScreen } from './LessonScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'L1', student: 's1' }),
}));
const mockSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswer(path)),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));

const mockAnswer = (path: string): unknown =>
  ({
    '/auth/me': { id: 'g1', role: 'guardian', permissions: ['self.portal'] },
    '/portal/me': { kind: 'guardian', students: [SARA], renew_url: null },
    '/portal/students/s1/lessons/L1/files': lessonPage(),
  })[path];

const F = t.lessonFiles;

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue({ url: 'https://files.example/x', expires_at: 'x' });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

test('the recording plays in the app; the report PDF and the files are listed', async () => {
  await renderWithQuery(<LessonScreen />, freshQueryClient());
  expect(await screen.findByText('صفحة الواجب')).toBeTruthy();
  expect(screen.getByText(F.reportPdf)).toBeTruthy();
  expect(screen.getByText(F.header.replace('{n}', '3'))).toBeTruthy();
  expect(screen.getByText(/^حلقة الأحد،? 15 نوفمبر$/)).toBeTruthy();
  expect(screen.getByText(F.kinds.voice_note)).toBeTruthy();
  expect(await screen.findByRole('button', { name: t.audioPlayer.play })).toBeTruthy();
  expect(mockSend).toHaveBeenCalledWith('POST', '/portal/students/s1/recordings/A/url');
});

test('a signed link never reaches the disk cache (noPersist)', async () => {
  const client = freshQueryClient();
  await renderWithQuery(<LessonScreen />, client);
  expect(await screen.findByRole('button', { name: t.audioPlayer.play })).toBeTruthy();
  const link = client.getQueryCache().find({ queryKey: offPathKeys.portalRecordingUrl('s1', 'A') });
  expect(link?.meta).toEqual({ noPersist: true });
});

test('a picture opens in the phone’s viewer from a fresh link', async () => {
  await renderWithQuery(<LessonScreen />, freshQueryClient());
  await fireEvent.press(await screen.findByText('صفحة الواجب'));
  await waitFor(() =>
    expect(mockSend).toHaveBeenCalledWith('POST', '/portal/students/s1/lesson-files/f1/url'));
  expect(Linking.openURL).toHaveBeenCalledWith('https://files.example/x');
});
