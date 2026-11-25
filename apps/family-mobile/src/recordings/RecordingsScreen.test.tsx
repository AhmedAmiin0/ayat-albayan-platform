import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { rec, SARA } from './recordings.fixtures';
import { RecordingsScreen } from './RecordingsScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswer(path)),
}));

let mockItems: unknown[] = [];
const mockAnswer = (path: string): unknown =>
  ({
    '/auth/me': { id: 'g1', role: 'guardian', permissions: ['self.portal'] },
    '/portal/me': { kind: 'guardian', students: [SARA], renew_url: null },
    '/portal/students/s1/recordings': { items: mockItems },
  })[path];

const F = t.lessonFiles;

test('Meet lessons: the empty note says why', async () => {
  mockItems = [];
  await renderWithQuery(<RecordingsScreen />, freshQueryClient());
  expect(await screen.findByText(F.empty)).toBeTruthy();
  expect(screen.getByText(F.emptyMeet.replace('{name}', 'سارة'))).toBeTruthy();
  expect(screen.getByText(F.emptyRoom)).toBeTruthy();
  expect(screen.queryByText(F.recordingsHint)).toBeNull();
});

test('one row per lesson, «جديد» until heard; a row opens the lesson page', async () => {
  mockItems = [rec('A', 'L1'), rec('B', 'L1'), rec('C', 'L2', '2026-10-30T14:00:00.000Z')];
  await renderWithQuery(<RecordingsScreen />, freshQueryClient());
  const [newest, ...rest] = await screen.findAllByRole('button', { name: F.recording });
  expect(rest).toHaveLength(1);
  expect(screen.getByText(F.parts.two)).toBeTruthy();
  expect(screen.getByText(F.recordingsHint)).toBeTruthy();
  expect(screen.getAllByText(F.isNew)).toHaveLength(2);
  if (newest) await fireEvent.press(newest);
  expect(router.push).toHaveBeenCalledWith('/lesson/L1?student=s1');
});
