import { setViewerPersonTz } from '@ab/client-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { emptyDraft, type BookingDraft } from '@/features/teaching/booking/draft/draft';
import { ABRAR } from '@/features/teaching/booking/wizard-fixture';
import { OtherTime } from './OtherTime';
import { OutsideNote } from './OutsideNote';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch,
}));

// Tue 1 Dec 2026: 21:30Z is 23:30 Tue in Cairo, 00:30 Wed in Riyadh.
const at = (startsAt: string, inside: boolean) => ({
  starts_at: startsAt,
  ends_at: startsAt,
  inside_hours: inside,
});
const NOON = at('2026-12-01T09:00:00.000Z', false);
const FIVE = at('2026-12-01T14:00:00.000Z', true);
const LATE = at('2026-12-01T21:30:00.000Z', false);
const LIST = {
  server_now: '2026-12-01T08:00:00.000Z',
  teacher_tz: 'Africa/Cairo',
  step_min: 30,
  slots: [NOON, FIVE, LATE],
};
const DRAFT: BookingDraft = { ...emptyDraft({ trial: true }), teacher: ABRAR, tz: 'Asia/Riyadh' };
const onPick = vi.fn();

function open(draft: BookingDraft = DRAFT) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <OtherTime draft={draft} onPick={onPick} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: t.booking.otherTime }));
}

describe('OtherTime (web «وقت آخر»)', () => {
  beforeEach(() => setViewerPersonTz('Asia/Riyadh'));
  afterEach(() => {
    apiFetch.mockReset();
    onPick.mockReset();
    setViewerPersonTz(null);
  });

  it('Riyadh viewer: two days, the first shown; each pick hands over its server slot', async () => {
    apiFetch.mockResolvedValue(LIST);
    open();
    const days = await screen.findByRole('group', { name: t.booking.otherTimeDay });
    expect(within(days).getAllByRole('radio')).toHaveLength(2);
    fireEvent.click(screen.getByRole('radio', { name: '12:00' }));
    fireEvent.click(screen.getByRole('radio', { name: '17:00' }));
    expect(onPick.mock.calls.map(([s]) => s)).toEqual([NOON, FIVE]);
    fireEvent.click(within(days).getAllByRole('radio')[1] as HTMLElement);
    fireEvent.click(screen.getByRole('radio', { name: '00:30' }));
    expect(onPick).toHaveBeenLastCalledWith(LATE);
  });

  it('Cairo viewer: one day, the family Riyadh clock beside each time', async () => {
    setViewerPersonTz('Africa/Cairo');
    apiFetch.mockResolvedValue(LIST);
    open();
    const days = await screen.findByRole('group', { name: t.booking.otherTimeDay });
    expect(within(days).getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: '11:00 · 12:00' })).toBeTruthy();
  });

  it('a malformed answer (a free-text time) is an alert, never shown as times', async () => {
    apiFetch.mockResolvedValue({ ...LIST, slots: [{ starts_at: 'noon' }] });
    open();
    expect((await screen.findByRole('alert')).textContent).toContain(t.booking.slotsError);
  });

  it('an empty fortnight says so, after loading; «إخفاء» closes it', async () => {
    apiFetch.mockResolvedValue({ ...LIST, slots: [] });
    open({ ...DRAFT, teacher: null });
    expect(screen.getByText(t.common.loading)).toBeTruthy();
    expect(await screen.findByText(t.booking.otherTimeEmpty)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.otherTimeHide }));
    expect(screen.queryByText(t.booking.otherTimeEmpty)).toBeNull();
  });

  it('OutsideNote warns only for an outside one-lesson pick', () => {
    const { rerender } = render(<OutsideNote draft={{ kind: 'trial', outsideHours: true }} />);
    expect(screen.getByText(t.booking.outsideHours)).toBeTruthy();
    rerender(<OutsideNote draft={{ kind: 'trial', outsideHours: false }} />);
    expect(screen.queryByText(t.booking.outsideHours)).toBeNull();
  });
});
