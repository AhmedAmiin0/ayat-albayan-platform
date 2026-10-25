import en from '@ab/shared/i18n/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { conflictText } from './ConflictNotice';
import { JOUD, lesson, SUHAILA } from './lesson-fixture';
import { LessonDetails } from './LessonDetails';
import { studentNames } from './lessons';
import { ProposalsPanel } from './ProposalsPanel';

// The UI in English (LTR): dates, joiners and the proposal arrow follow it, not the Arabic default.
vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const PENDING = { id: 'p1', proposed_starts_at: '2026-10-05T15:00:00.000Z', note: null, created_at: '2026-10-03T08:00:00.000Z' };
vi.mock('@/lib/http/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch: vi.fn(async () => [lesson({ pending_proposal: PENDING })]),
}));

const ARABIC = /[؀-ۿ]/;

describe('schedule screens in English', () => {
  it('the drawer reads the lesson time in English', () => {
    render(<QueryClientProvider client={new QueryClient()}><LessonDetails lesson={lesson()} /></QueryClientProvider>);
    expect(screen.getByText(`Sunday 4 October 17:00 ${en.schedule.riyadhTime}`)).toBeTruthy();
  });

  it('a time-change request reads old → new, the way LTR text runs', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProposalsPanel onOpen={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Sunday 4 October 17:00 → Monday 5 October 18:00')).toBeTruthy();
  });

  it('a clash on the teacher’s clock joins with «, »', () => {
    const clash = { kind: 'outside_availability' as const, startsAt: '2026-10-04T14:00:00.000Z', endsAt: '2026-10-04T14:45:00.000Z' };
    const text = conflictText(clash, 'Africa/Cairo');
    expect(text).toContain('Sunday 4 October 17:00, Teacher: 17:00');
    expect(text).not.toMatch(ARABIC);
  });

  it('a group’s names join with «and»', () => {
    expect(studentNames(lesson({ students: [SUHAILA, JOUD] }))).toBe(`${SUHAILA.name} and ${JOUD.name}`);
  });
});
