import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { SCHEDULED } from './edit-time-fixture';
import { lesson } from '../lesson/lesson-fixture';
import { LessonDrawer } from '../lesson/LessonDrawer';
import { LessonTags } from '../lesson/LessonTags';

vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(async () => []), apiSend: vi.fn() }));

describe('«عدّل الوقت» next to «غيّر الموعد» (R-SCH-11)', () => {
  it('each button says what it does, in the drawer, before anything is opened', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LessonDrawer lesson={SCHEDULED} onClose={vi.fn()} onDone={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(t.lessons.timeEdit.captionEdit)).toBeTruthy();
    expect(screen.getByText(t.lessons.timeEdit.captionReschedule)).toBeTruthy();
    expect(t.lessons.event.reschedule).toBe(t.lessons.rescheduleSubmit); // one label, so the hint quotes the real button
    expect(t.lessons.timeEdit.vsReschedule).toContain(`«${t.lessons.event.reschedule}»`);
  });

  it('the «عُدّل الوقت» tag is a note with «كان …» as its tooltip, not a pill that looks pressable', () => {
    const edited = lesson({
      time_edit: { at: '2026-10-03T08:00:00.000Z', reason: null, was: { starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T13:45:00.000Z' } },
    });
    render(<LessonTags lesson={edited} />);
    const tag = screen.getByText(t.lessons.timeEdit.tag);
    expect(tag.getAttribute('title')).toMatch(/كان: .* 16:00/);
    expect(tag.className).not.toMatch(/\bborder\b/);
  });
});
