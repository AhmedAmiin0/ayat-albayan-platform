import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SlotGrid } from './SlotGrid';

const slot = (startsAt: string) => ({ starts_at: startsAt, ends_at: startsAt, conflicts: [] });
const SUN = '2026-10-04T14:00:00.000Z'; // Sunday 17:00 Riyadh
const TUE = '2026-10-06T16:30:00.000Z'; // Tuesday 19:30 Riyadh
const WED = '2026-10-07T15:00:00.000Z'; // Wednesday 18:00

describe('SlotGrid multi-pick (owner 2026-10-18)', () => {
  it('shows the value and the other picks pressed, and reports every tap', () => {
    const onPick = vi.fn();
    render(
      <SlotGrid
        week="2026-10-03"
        slots={[slot(SUN), slot(TUE), slot(WED)]}
        studentTz="Asia/Riyadh"
        value={SUN}
        also={[TUE]}
        onPick={onPick}
      />,
    );
    const pressed = (name: RegExp) =>
      screen.getByRole('button', { name }).getAttribute('aria-pressed');
    expect(pressed(/^17:00/)).toBe('true');
    expect(pressed(/19:30/)).toBe('true');
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /19:30/ }));
    expect(onPick).toHaveBeenCalledWith(slot(TUE));
  });

  it('a start with conflicts stays pickable but reads busy; a day without starts shows a dash', () => {
    const onPick = vi.fn();
    const clash = { kind: 'teacher_busy' as const, startsAt: SUN, endsAt: SUN };
    const busy = { ...slot(SUN), conflicts: [clash] };
    render(
      <SlotGrid
        week="2026-10-03"
        slots={[busy]}
        studentTz="Asia/Riyadh"
        value={null}
        onPick={onPick}
      />,
    );
    expect(screen.getByText(t.booking.slotBusy)).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: /17:00/ }));
    expect(onPick).toHaveBeenCalledWith(busy);
  });
});

describe('SlotGrid scroll owner (docs/66 §2)', () => {
  it('no day column scrolls or caps its height on a wide page; the page or dialog body scrolls', () => {
    const slots = [slot(SUN), slot(TUE), slot(WED)];
    render(<SlotGrid week="2026-10-03" slots={slots} studentTz="Asia/Riyadh" value={null} onPick={vi.fn()} />);
    const lists = screen.getByRole('group').querySelectorAll('ul');
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) expect(list.className).not.toMatch(/overflow-(y-)?(auto|scroll)|max-h-/);
  });
});
