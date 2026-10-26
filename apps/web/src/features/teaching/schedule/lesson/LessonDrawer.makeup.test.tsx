import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InvoiceView } from '@/features/teaching/booking/draft/contract';
import { t } from '@/lib/i18n/i18n';
import { JOUD, lesson, SUHAILA } from './lesson-fixture';
import { LessonChip } from './LessonChip';
import { LessonDrawer } from './LessonDrawer';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children }: { to: string; search: Record<string, string>; children: ReactNode }) => (
    <a href={`${to}?${new URLSearchParams(search)}`}>{children}</a>
  ),
  // ReportLink (shown once the lesson is past) asks for the router; none is mounted here.
  useRouter: () => undefined,
}));

const makeup = (l: LessonView): LessonView & { makeup: true } => ({ ...l, makeup: true });
const INVOICE: InvoiceView = {
  id: 'inv-1',
  rule_id: 'r-1',
  kind: 'package',
  mime: 'application/pdf',
  size_bytes: 9,
  source: 'whatsapp',
  created_at: '2026-10-03T09:00:00.000Z',
  students: [],
};

function renderDrawer(l: LessonView, invoices: InvoiceView[] = []) {
  apiFetch.mockImplementation(async (path: string) => (path.startsWith('/invoices?') ? invoices : path === '/messaging/templates' ? [] : { url: 'https://signed/inv' }));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LessonDrawer lesson={l} onClose={vi.fn()} onDone={vi.fn()} />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('«تعويضية» tag (R-SCH-10)', () => {
  it('a makeup lesson wears the tag next to its status; a normal one does not', () => {
    const { rerender } = render(<LessonChip lesson={makeup(lesson())} onOpen={vi.fn()} />);
    expect(screen.getByText(t.booking.makeup.tag)).toBeTruthy();
    rerender(<LessonChip lesson={lesson()} onOpen={vi.fn()} />);
    expect(screen.queryByText(t.booking.makeup.tag)).toBeNull();
  });
});

describe('LessonDrawer «حجز تعويضي» (R-SCH-10)', () => {
  it('a no-show opens the wizard for that student with the lesson preselected', () => {
    renderDrawer(lesson({ id: 'l-9', status: 'no_show' }));
    const link = screen.getByRole('link', { name: t.booking.makeup.action });
    expect(link.getAttribute('href')).toBe('/admin/book?kind=makeup&studentId=s-1&missedLessonId=l-9');
  });

  it('an excused lesson too, one link per charged student of a group', () => {
    renderDrawer(lesson({ status: 'excused', students: [SUHAILA, { ...JOUD, chargeable: false }, { ...JOUD, id: 's-3', name: 'نور' }] }));
    const links = screen.getAllByRole('link', { name: new RegExp(t.booking.makeup.action) });
    expect(links.map((l) => l.textContent)).toEqual([`${t.booking.makeup.action} · سهيلة`, `${t.booking.makeup.action} · نور`]);
  });

  it('is not offered on a completed lesson, a trial, a makeup, or an uncharged absence', () => {
    for (const l of [
      lesson({ status: 'completed' }),
      lesson({ status: 'no_show', trial: true }),
      makeup(lesson({ status: 'no_show' })),
      lesson({ status: 'excused', students: [{ ...SUHAILA, chargeable: false }] }),
    ]) {
      renderDrawer(l);
      expect(screen.queryByRole('link', { name: new RegExp(t.booking.makeup.action) })).toBeNull();
      cleanup();
    }
  });
});

describe('rescheduling a makeup (R-SCH-10)', () => {
  it('only this lesson can move: «وكل اللي بعدها» would drop its link to the missed one', () => {
    apiFetch.mockImplementation(async (path: string) =>
      path.startsWith('/invoices?') ? [] : { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [] },
    );
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LessonDrawer lesson={makeup(lesson())} onClose={vi.fn()} onDone={vi.fn()} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.lessons.event.reschedule }));
    expect(screen.getByRole('radio', { name: t.lessons.scope.rule })).toHaveProperty('disabled', true);
    expect(screen.getByRole('radio', { name: t.lessons.scope.one })).toHaveProperty('disabled', false);
  });
});

describe('LessonDrawer invoice row (R-PAY-03, admin only)', () => {
  it('shows «الفاتورة» for the booking’s rule and opens it', async () => {
    renderDrawer(lesson({ rule_id: 'r-1' }), [INVOICE]);
    const open = await screen.findByRole('button', { name: t.booking.invoice.view });
    expect(apiFetch).toHaveBeenCalledWith('/invoices?ruleId=r-1');
    fireEvent.click(open);
    const dialog = await screen.findByRole('dialog', { name: new RegExp(t.booking.invoice.label) });
    expect((await within(dialog).findByTitle(new RegExp(t.booking.invoice.label))).getAttribute('src')).toBe('https://signed/inv');
  });

  it('asks nothing for a trial, and shows nothing when there is no invoice', async () => {
    renderDrawer(lesson({ trial: true }));
    expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/invoices'));
    cleanup();
    renderDrawer(lesson());
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/invoices')));
    expect(screen.queryByRole('button', { name: t.booking.invoice.view })).toBeNull();
  });
});
