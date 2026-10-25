import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { mediaCardLabel } from './ChatMediaPicker';
import type { BookSearch } from './api';
import { BookingPage } from './BookingPage';
import type { MakeupCandidate } from './contract';
import {
  ABRAR,
  bookingBodies,
  next,
  pickSlot,
  respond,
  routeSend,
  SISTER_ID,
  SLOT,
  STUDENT_ID,
} from './wizard-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children }: { to: string; search: Record<string, string>; children: ReactNode }) => (
    <a href={`${to}?${new URLSearchParams(search)}`}>{children}</a>
  ),
}));

const MISSED: MakeupCandidate = {
  lesson_id: '5a2d9c1e-0000-4000-8000-000000000001',
  starts_at: '2026-09-27T14:00:00.000Z',
  status: 'no_show',
  duration_min: 45,
  teacher: { id: ABRAR.id, display_name_ar: 'أبرار' },
};
const PHOTO = { message_id: 'm-photo', created_at: '2026-10-02T10:00:00.000Z', mime: 'image/jpeg', caption: null, expired: false };
const RESULT = {
  rule_id: 'r1',
  student_ids: [STUDENT_ID],
  guardian_ids: ['g-1'],
  lessons: [{ id: 'l1', starts_at: SLOT, ends_at: SLOT }],
  message_ids: ['m1'],
  invoice_id: 'inv-1',
};

function renderBooking(search: BookSearch) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/booking/makeup-candidates')) return [MISSED];
    if (path.endsWith('/media')) return [PHOTO];
    if (path.includes('/media/')) return { url: 'https://signed/photo', mime: 'image/jpeg', expires_at: SLOT };
    return respond(path);
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingPage search={search} onOpenStudent={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('BookingWizard: makeup and trial for a registered student (R-SCH-10, R-PAY-03)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a missed lesson’s «حجز تعويضي»: missed lesson → its teacher → slot → invoice from the chat → booked, no subscription', async () => {
    routeSend(apiSend, [RESULT]);
    renderBooking({ studentId: STUDENT_ID, kind: 'makeup', missedLessonId: MISSED.lesson_id });
    expect(await screen.findByRole('heading', { level: 1, name: t.booking.makeup.title })).toBeTruthy();
    expect(await screen.findByRole('radio', { name: t.booking.kind.makeup })).toHaveProperty('checked', true);
    // One student only: the sister is not offered.
    expect(screen.queryByRole('checkbox', { name: /جود/ })).toBeNull();
    next();

    // The drawer's lesson is already picked; the teacher comes preselected, no package step.
    const missed = await screen.findByRole('radio', { name: new RegExp(t.enums.lessonStatus.no_show) });
    await waitFor(() => expect(missed).toHaveProperty('checked', true));
    next();
    const teacher = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
    await waitFor(() => expect(teacher).toHaveProperty('checked', true));
    await pickSlot();
    expect(screen.queryByRole('checkbox', { name: t.enums.weekday[3] })).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(false));
    next();

    // The invoice is required for a makeup too; the guardian's chat photo is the proof.
    expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: t.booking.invoice.fromChat }));
    expect(apiFetch).toHaveBeenCalledWith('/threads/%2B966501234567/media');
    const dialog = await screen.findByRole('dialog', { name: t.booking.invoice.chatTitle });
    fireEvent.click(await within(dialog).findByRole('button', { name: mediaCardLabel(PHOTO) }));
    next();

    expect(screen.getByText(t.booking.makeup.missedLabel, { selector: 'dt' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.submit }));
    expect(await screen.findByText(t.booking.makeup.booked)).toBeTruthy();
    const [body] = bookingBodies(apiSend);
    expect(body).toEqual({
      studentIds: [STUDENT_ID],
      teacherId: ABRAR.id,
      byday: [0],
      startTimeLocal: '17:00',
      tz: 'Asia/Riyadh',
      durationMin: 45,
      startsOn: '2026-10-04',
      kind: 'makeup',
      makeupOfLessonId: MISSED.lesson_id,
      invoice: { source: 'whatsapp', messageId: 'm-photo' },
      meetingLink: null,
      clientRequestId: expect.any(String),
      startsAt: SLOT,
    });
    expect(screen.queryByRole('button', { name: t.inbox.subscription.make })).toBeNull();
  });

  it('a trial needs no invoice: no invoice step, nothing sent', async () => {
    routeSend(apiSend, [{ ...RESULT, invoice_id: null }]);
    renderBooking({ studentId: STUDENT_ID, kind: 'trial' });
    expect(await screen.findByRole('radio', { name: t.booking.kind.trial })).toHaveProperty('checked', true);
    fireEvent.click(await screen.findByRole('checkbox', { name: /جود/ }));
    expect(screen.getByRole('radio', { name: t.booking.kind.makeup }).hasAttribute('disabled')).toBe(false);
    next();
    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) }));
    next();
    // Length only: no package options for a free trial.
    expect(screen.queryByRole('radio', { name: new RegExp(t.enums.packageSize['8']) })).toBeNull();
    await pickSlot();
    await waitFor(() => expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(false));
    next();
    expect(screen.queryByRole('region', { name: t.booking.steps.invoice })).toBeNull();
    expect(screen.queryByText(t.booking.invoice.label)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.booking.submit }));
    await screen.findByRole('status');
    const [body] = bookingBodies(apiSend);
    expect(body).toMatchObject({ kind: 'trial', package: 'trial', studentIds: [STUDENT_ID, SISTER_ID], byday: [0] });
    expect(body).not.toHaveProperty('invoice');
  });
});
