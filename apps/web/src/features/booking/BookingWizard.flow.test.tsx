import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { BookingPage } from './BookingPage';
import {
  ABRAR,
  addInvoice,
  INVOICE_PATH,
  next,
  NOOR,
  pickSlot,
  pickTeacher,
  pickTeacherAndSlot,
  pickWednesday,
  respond,
  routeSend,
  SISTER_ID,
  SLOT,
  STUDENT_ID,
} from './wizard-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@/lib/http/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children }: { to: string; search: Record<string, string>; children: ReactNode }) => (
    <a href={`${to}?${new URLSearchParams(search)}`}>{children}</a>
  ),
}));

function renderBooking() {
  apiFetch.mockImplementation(respond);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingPage search={{ studentId: STUDENT_ID }} onOpenStudent={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('BookingWizard from a student profile (R-SCH-06)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('student + sister → teacher → length + package → slot + repeat → review → booked', async () => {
    routeSend(apiSend, [
      {
        rule_id: 'r1',
        student_ids: [STUDENT_ID, SISTER_ID],
        guardian_ids: ['g-1'],
        lessons: [{ id: 'l1', starts_at: SLOT, ends_at: SLOT }],
        message_ids: ['m1'],
      },
    ]);
    renderBooking();
    expect(await screen.findByRole('heading', { level: 1, name: t.booking.title })).toBeTruthy();
    fireEvent.click(await screen.findByRole('checkbox', { name: /جود/ }));
    next();

    // The student's gender preference preselects the chip; the unavailable teacher says why.
    expect(apiFetch).toHaveBeenCalledWith('/booking/teachers?program=quran&gender=female');
    const noor = await screen.findByRole('radio', { name: new RegExp(NOOR.display_name_ar) });
    expect(noor.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(`${t.booking.notAvailable}: ${t.booking.noAvailabilityWhy}`)).toBeTruthy();
    await pickTeacher();

    const pkg = await screen.findByRole('radio', { name: new RegExp(t.enums.packageSize['8']) });
    expect(pkg).toHaveProperty('checked', true);
    expect(await screen.findAllByText('1,080')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/pricing\/quote\?country=SA&duration=45&tier=starter&students=2/));

    await pickSlot();
    expect(String(apiFetch.mock.calls.find(([p]) => String(p).startsWith('/booking/slots'))?.[0])).toContain(
      `studentIds=${STUDENT_ID}%2C${SISTER_ID}`,
    );
    // The paid package came first, so a second day at its own time is picked right on the slot
    // grid, and the whole series is checked there before the review.
    expect(screen.getByText(t.booking.pickDayTimes)).toBeTruthy();
    pickWednesday();
    expect(screen.getByRole('button', { name: t.booking.removeDay.replace('{day}', t.enums.weekday[3]) })).toBeTruthy();
    expect(await screen.findByText(t.booking.seriesFree)).toBeTruthy();
    const dayTimes = [{ weekday: 3, startTimeLocal: '19:30' }];
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/check', expect.objectContaining({ byday: [0, 3], dayTimes }));
    next();

    // A paid package needs its invoice (R-PAY-03): «التالي» waits, the upload goes to the bucket.
    expect(screen.getByRole('region', { name: t.booking.steps.invoice })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(t.booking.invoice.hint)).toBeTruthy();
    await addInvoice(uploadToSignedUrl);
    expect(uploadToSignedUrl).toHaveBeenCalledWith(INVOICE_PATH, 'tok', expect.any(File), { contentType: 'image/png' });
    next();

    fireEvent.click(screen.getByRole('button', { name: t.booking.submit }));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', t.booking.booked);
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking', {
      studentIds: [STUDENT_ID, SISTER_ID],
      teacherId: ABRAR.id,
      byday: [0, 3],
      dayTimes: [{ weekday: 3, startTimeLocal: '19:30' }],
      startTimeLocal: '17:00',
      tz: 'Asia/Riyadh',
      durationMin: 45,
      startsOn: '2026-10-04',
      package: '8',
      kind: 'package',
      invoice: { source: 'upload', path: INVOICE_PATH },
      meetingLink: null,
      clientRequestId: expect.any(String),
      startsAt: SLOT,
    });
    const open = screen.getByRole('link', { name: t.booking.openSchedule });
    expect(open.getAttribute('href')).toBe(`/admin/schedule?week=2026-10-03&teachers=${ABRAR.id}`);
  });

  it('«التالي» waits for a choice on each step', async () => {
    routeSend(apiSend, []);
    renderBooking();
    await screen.findByRole('checkbox', { name: /جود/ });
    next();
    await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
    expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(true);
    await pickTeacherAndSlot();
    const step = screen.getByRole('region', { name: t.booking.steps.slot });
    expect(within(step).getByRole('status').textContent).toContain('17:00');
    await waitFor(() => expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(false));
  });
});
