import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { fakeNow, HELD, openEditTime, pick, SAVED } from './edit-time-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(async () => []), apiSend }));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: ({ to, search, children, className }: { to: string; search: { month: string }; children: string; className?: string }) => (
    <a href={`${to}?month=${search.month}`} className={className}>{children}</a>
  ),
}));

const TIME = new RegExp(t.lessons.timeEdit.time.replace('{city}', '.+'));
const optionsOf = () => within(screen.getByLabelText(TIME)).getAllByRole('option').map((o) => o.getAttribute('value'));

describe('«عدّل الوقت» on a held lesson: correct what was recorded (R-SCH-11)', () => {
  fakeNow();
  beforeEach(() => apiSend.mockResolvedValue({ ...SAVED, payout: 'draft_stale', pdf_refresh: true }));
  afterEach(() => apiSend.mockReset());

  it('fixes the day, asks for a reason and says nothing is sent to the guardian', () => {
    openEditTime(HELD);
    expect(screen.getByRole('region', { name: t.lessons.timeEdit.correctTitle })).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull(); // no day chips, no date input
    expect(screen.queryByLabelText(t.lessons.timeEdit.otherDate)).toBeNull();
    expect(screen.getByText(new RegExp(`^${t.enums.weekday[6]} 3 أكتوبر`))).toBeTruthy();
    pick.duration(60);
    expect(screen.queryByLabelText(t.lessons.timeEdit.notify)).toBeNull();
    expect(screen.queryByText(t.lessons.timeEdit.vsReschedule)).toBeNull();
  });

  it('only offers starts that have already ended on the lesson day (start + length ≤ now)', () => {
    openEditTime(HELD); // now = 12:00; 45 minutes
    expect(optionsOf()).toContain('11:15');
    expect(optionsOf()).not.toContain('11:30');
    pick.duration(60);
    expect(optionsOf()).toContain('11:00');
    expect(optionsOf()).not.toContain('11:15');
  });

  it('warns before saving: payout when the length changes, the report file, attendance stays', () => {
    openEditTime(HELD);
    pick.time('09:45'); // start only: the payout line does not change
    expect(screen.getByText(t.lessons.timeEdit.heldNote)).toBeTruthy();
    expect(screen.getByText(t.lessons.timeEdit.pdfRefresh)).toBeTruthy();
    expect(screen.queryByText(t.lessons.timeEdit.payoutWarn)).toBeNull();
    pick.duration(60);
    expect(screen.getByText(t.lessons.timeEdit.payoutWarn)).toBeTruthy();
  });

  it('refuses a blank reason before calling the API', () => {
    openEditTime(HELD);
    pick.duration(60);
    pick.save();
    expect(screen.getByText(t.lessons.error.reason_required)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    pick.reason('   ');
    pick.save();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('saves 45 → 60 with the reason, then shows the payout and report follow-ups until «تمام»', async () => {
    const { onDone, onClose } = openEditTime(HELD);
    pick.duration(60);
    pick.reason('الحلقة خدت ساعة بدل 45 دقيقة');
    pick.save();
    expect(await screen.findByText(t.lessons.timeEdit.payoutDraft)).toBeTruthy();
    expect(screen.getByText(t.lessons.timeEdit.pdfRefresh)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(t.lessons.timeEdit.saved);
    expect(screen.getByText(/الميعاد الجديد: .*4 أكتوبر/)).toBeTruthy(); // what was saved: the lesson as the API returned it
    expect(screen.getByRole('link', { name: t.lessons.timeEdit.payoutLink }).getAttribute('href')).toBe('/admin/payouts?month=2026-10');
    expect(onDone).not.toHaveBeenCalled();
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/lessons/l-9/time', {
      expectedStartsAt: '2026-10-03T07:00:00.000Z',
      expectedEndsAt: '2026-10-03T07:45:00.000Z',
      startsAt: '2026-10-03T07:00:00.000Z',
      durationMin: 60,
      reason: 'الحلقة خدت ساعة بدل 45 دقيقة',
    });
    fireEvent.click(screen.getByRole('button', { name: t.lessons.timeEdit.close }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.lessons.timeEdit.saved));
    expect(onClose).toHaveBeenCalled();
  });

  it('a save with nothing left to do closes straight away', async () => {
    apiSend.mockResolvedValue(SAVED);
    const { onDone } = openEditTime(HELD);
    pick.time('09:45');
    pick.reason('الساعة غلط');
    pick.save();
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.lessons.timeEdit.saved));
  });
});
