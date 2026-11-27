import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { lesson, student } from '@/portal/portal.fixtures';
import { UpcomingPanel } from './UpcomingPanel';

const mockFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));
jest.mock('@ab/mobile-kit/room', () => ({
  ...jest.requireActual('@ab/mobile-kit/room'),
  useNativeRoom: () => ({ data: {} }),
}));

const answer = (lessons: unknown[]) => ({
  lessons,
  prepare: null,
  month: { attended: 0, absent: 0 },
});
const show = () =>
  renderWithQuery(<UpcomingPanel student={student()} own={false} />, freshQueryClient());

beforeEach(() => jest.clearAllMocks());

test('no lesson ahead: the empty note instead of the next-lesson card', async () => {
  mockFetch.mockResolvedValue(answer([]));
  await show();
  expect(await screen.findByText(t.portal.lessonsEmpty)).toBeTruthy();
  expect(screen.queryByText(t.portal.app.lesson.roomNote)).toBeNull();
});

test('a lesson ahead: the next-lesson card and no empty note', async () => {
  mockFetch.mockResolvedValue(answer([lesson(new Date(), 30)]));
  await show();
  expect(await screen.findByText(t.portal.app.lesson.roomNote)).toBeTruthy();
  expect(screen.queryByText(t.portal.lessonsEmpty)).toBeNull();
});
