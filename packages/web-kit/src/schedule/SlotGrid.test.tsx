import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlotGrid } from './SlotGrid';

const slot = (startsAt: string) => ({ starts_at: startsAt, ends_at: startsAt, conflicts: [] });
const SUN = '2026-10-04T14:00:00.000Z'; // Sunday 17:00 Riyadh
const TUE = '2026-10-06T16:30:00.000Z'; // Tuesday 19:30 Riyadh
const WED = '2026-10-07T15:00:00.000Z'; // Wednesday 18:00

describe('SlotGrid multi-pick (owner 2026-10-18)', () => {
  it('shows the value and the other picks pressed, and reports every tap', () => {
    const onPick = vi.fn();
    render(<SlotGrid week="2026-10-03" slots={[slot(SUN), slot(TUE), slot(WED)]} studentTz="Asia/Riyadh" value={SUN} also={[TUE]} onPick={onPick} />);
    const pressed = (name: RegExp) => screen.getByRole('button', { name }).getAttribute('aria-pressed');
    expect(pressed(/^17:00/)).toBe('true');
    expect(pressed(/19:30/)).toBe('true');
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /19:30/ }));
    expect(onPick).toHaveBeenCalledWith(slot(TUE));
  });
});
