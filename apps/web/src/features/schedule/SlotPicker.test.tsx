import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SlotPicker } from './SlotPicker';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const FREE = { starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z', conflicts: [] };
const BUSY = {
  starts_at: '2026-10-04T15:00:00.000Z',
  ends_at: '2026-10-04T15:45:00.000Z',
  conflicts: [{ kind: 'teacher_busy', startsAt: '2026-10-04T15:00:00.000Z', endsAt: '2026-10-04T15:45:00.000Z' }],
};

function renderPicker(onPick = vi.fn()) {
  apiFetch.mockResolvedValue({ teacher_tz: 'Africa/Cairo', step_min: 45, slots: [FREE, BUSY] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SlotPicker teacherId="t1" durationMin={45} studentIds={['s1']} studentTz="America/New_York" value={null} onPick={onPick} />
    </QueryClientProvider>,
  );
  return onPick;
}

describe('SlotPicker (R-SCH-06, R-SCH-01)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T10:00:00.000Z')); // Saturday in Riyadh
  });
  afterEach(() => vi.useRealTimers());

  it('asks for the rest of this Riyadh week, for the teacher, the duration and the students', async () => {
    renderPicker();
    await screen.findByRole('button', { name: /17:00/ });
    const url = String(apiFetch.mock.calls[0]?.[0]);
    expect(url).toContain('/booking/slots?teacherId=t1');
    expect(url).toContain('from=2026-10-03T10%3A00%3A00.000Z');
    expect(url).toContain('to=2026-10-09T21%3A00%3A00.000Z');
    expect(url).toContain('durationMin=45&studentIds=s1');
  });

  it('shows Riyadh times big and the student zone small, under the Riyadh day', async () => {
    renderPicker();
    const sunday = await screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[0]} 4 `) });
    const free = within(sunday).getByRole('button', { name: /17:00/ });
    expect(free.textContent).toContain('10:00'); // New York
    expect(screen.getByText(t.booking.slotLegend.replace('{city}', t.tz['America/New_York']))).toBeTruthy();
  });

  it('marks a slot with conflicts «غير متاح» but keeps it pickable', async () => {
    const onPick = renderPicker();
    const busy = await screen.findByRole('button', { name: new RegExp(t.booking.slotBusy) });
    expect(busy.textContent).toContain('18:00');
    fireEvent.click(busy);
    expect(onPick).toHaveBeenCalledWith(BUSY);
  });

  it('starts on this week (no going back) and moves a week forward', async () => {
    renderPicker();
    await screen.findByRole('button', { name: /17:00/ });
    expect(screen.getByRole('button', { name: t.schedule.prevWeek }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: t.schedule.nextWeek }));
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(String(apiFetch.mock.calls[1]?.[0])).toContain('from=2026-10-09T21%3A00%3A00.000Z');
    expect(screen.getByText(t.schedule.weekOf.replace('{date}', '10 أكتوبر'))).toBeTruthy();
  });

  it('opens on the week of the lesson being moved (never a past week)', async () => {
    apiFetch.mockResolvedValue({ teacher_tz: 'Africa/Cairo', step_min: 45, slots: [] });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SlotPicker teacherId="t1" durationMin={45} studentIds={[]} studentTz="Asia/Riyadh" value={null} near="2026-10-13T14:00:00.000Z" onPick={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(t.booking.noSlots)).toBeTruthy();
    expect(String(apiFetch.mock.calls[0]?.[0])).toContain('from=2026-10-09T21%3A00%3A00.000Z');
    expect(screen.getByRole('button', { name: t.schedule.prevWeek }).hasAttribute('disabled')).toBe(false);
  });
});
