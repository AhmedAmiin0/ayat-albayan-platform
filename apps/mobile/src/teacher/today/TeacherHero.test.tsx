import type { Hero } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { confirmingQueryClient, renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { TeacherHero } from './TeacherHero';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));
let mockNow = new Date('2026-10-01T13:10:00Z');
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => mockNow }));

const onReport = jest.fn();
const props = { onDetails: jest.fn(), onNotice: jest.fn(), onReport };
/** 13:00–13:45Z in our classroom. */
const room = lesson({ id: 'room', status: 'confirmed', platform_classroom: true });

function Keyed({ hero }: { hero: Hero<LessonView> }) {
  return <TeacherHero key={hero.lesson.id} hero={hero} {...props} />;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNow = new Date('2026-10-01T13:10:00Z');
});

test('a running platform lesson: one «ادخل الحلقة» lead, «اكتب التقرير» the peer', async () => {
  await renderWithQuery(<Keyed hero={{ kind: 'running', lesson: room }} />);
  const row = within(screen.getByTestId('teacher-hero-actions'));
  expect(row.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(1);
  expect(row.getByRole('button', { name: t.reports.open })).toBeTruthy();
  expect(screen.getByText(t.today.running)).toBeTruthy();
  await fireEvent.press(row.getByRole('button', { name: t.reports.open }));
  expect(onReport).toHaveBeenCalledWith('room');
});

test('ahead in room mode: «سأحضر» leads, her word, «تُفتح الساعة …» under it', async () => {
  mockNow = new Date('2026-10-01T12:00:00Z');
  const next = { ...room, status: 'scheduled' as const };
  await renderWithQuery(<Keyed hero={{ kind: 'next', lesson: next, minutes: 60 }} />);
  expect(screen.getByText(t.teacherToday.awaiting)).toBeTruthy();
  const row = within(screen.getByTestId('teacher-hero-actions'));
  expect(row.getByRole('button', { name: t.teacherBoard.confirm })).toBeTruthy();
  expect(row.queryByRole('button', { name: t.classroom.enter })).toBeNull();
  expect(screen.getByText(/^تُفتح الساعة|^Opens at/)).toBeTruthy();
});

test('a refused «سأحضر» (409) says «بدأت الحلقة…»; another lesson clears it', async () => {
  mockNow = new Date('2026-10-01T12:00:00Z');
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started' }));
  const first = lesson({ id: 'a' });
  const { rerender } = await renderWithQuery(
    <Keyed hero={{ kind: 'next', lesson: first, minutes: 60 }} />,
    confirmingQueryClient(),
  );
  await fireEvent.press(screen.getByRole('button', { name: t.teacherBoard.confirm }));
  expect(await screen.findByText(t.teacherBoard.lessonStarted)).toBeTruthy();
  await rerender(<Keyed hero={{ kind: 'next', lesson: lesson({ id: 'b' }), minutes: 60 }} />);
  expect(screen.queryByText(t.teacherBoard.lessonStarted)).toBeNull();
});
