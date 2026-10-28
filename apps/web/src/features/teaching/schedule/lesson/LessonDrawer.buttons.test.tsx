import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { lesson } from './lesson-fixture';
import { LessonDrawer } from './LessonDrawer';

vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

const PENDING = { id: 'p1', proposed_starts_at: '2026-10-06T15:30:00.000Z', note: null, created_at: '2026-10-03T08:00:00.000Z' };

function renderDrawer(l: LessonView) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LessonDrawer lesson={l} onClose={vi.fn()} onDone={vi.fn()} />
    </QueryClientProvider>,
  );
}

const button = (name: string) => screen.getByRole('button', { name });

/** docs/07 «الأزرار»: peers share one ButtonRow (equal cells), the first named sits at the reading start. */
function expectRow(first: HTMLElement, second: HTMLElement) {
  const row = first.parentElement;
  expect(row).toBe(second.parentElement);
  expect(row?.className).toContain('*:flex-[1_1_0]');
  expect(row?.firstElementChild).toBe(first);
}

describe('LessonDrawer buttons (docs/07 «الأزرار»)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('cancel form: the danger submit first, «رجوع» a secondary in the same row', () => {
    renderDrawer(lesson());
    fireEvent.click(button(t.lessons.cancelSubmit));
    const submit = button(t.lessons.cancelSubmit);
    const back = button(t.lessons.back);
    expectRow(submit, back);
    expect(back.className).toContain('border-input');
    expect(back.className).not.toContain('text-lapis');
  });

  it('reschedule form: submit (primary) first, «رجوع» secondary in the same row', () => {
    renderDrawer(lesson());
    fireEvent.click(button(t.lessons.event.reschedule));
    const submit = button(t.lessons.rescheduleSubmit);
    expectRow(submit, button(t.lessons.back));
    expect(submit.className).toContain('bg-primary');
  });

  it('a teacher proposal: approve (primary) | reject (secondary) as one row, 48px on phones', () => {
    renderDrawer(lesson({ pending_proposal: PENDING }));
    const approve = button(t.lessons.proposal.approve);
    const reject = button(t.lessons.proposal.reject);
    expectRow(approve, reject);
    expect(reject.className).toContain('border-input');
    expect(approve.className).toContain('min-h-12');
  });

  it('the lesson link: the URL on its own line, the join link a full-width button under it', () => {
    renderDrawer(lesson());
    const link = screen.getByRole('link', { name: t.lessons.join });
    expect(link.textContent).toBe(t.lessons.join);
    expect(link.previousElementSibling?.textContent).toContain('meet.jit.si');
  });

  it('a pending proposal: «موافقة» is the one filled button, so «تأكيد الحلقة» is outlined', () => {
    renderDrawer(lesson({ pending_proposal: PENDING }));
    const confirm = button(t.lessons.event.confirm).className.split(' ');
    expect(confirm).toContain('border-input');
    expect(confirm).not.toContain('bg-primary');
  });

  it('no proposal: «تأكيد الحلقة» is the filled primary, full width', () => {
    renderDrawer(lesson());
    expect(button(t.lessons.event.confirm).className.split(' ')).toEqual(expect.arrayContaining(['bg-primary', 'w-full']));
  });
});
