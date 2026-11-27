import { viewerTz } from '@ab/client-core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { WeekSlotsFrame } from './WeekSlotsFrame';
import type { SlotsRead } from './WeekSlotsFrame';

const FIRST = '2026-10-03';
const NEXT = '2026-10-10';
const SLOT = { starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:30:00.000Z' };

interface Setup {
  week?: string;
  studentTz?: string;
  read?: SlotsRead;
}

function open({ week = FIRST, studentTz = viewerTz(), read }: Setup = {}) {
  const onWeek = vi.fn();
  const slots = read ?? { data: [{ ...SLOT, conflicts: [] }], isError: false };
  render(
    <WeekSlotsFrame
      week={week}
      first={FIRST}
      onWeek={onWeek}
      studentTz={studentTz}
      read={slots}
      grid={{ value: null, onPick: vi.fn() }}
    />,
  );
  return onWeek;
}

const button = (name: string) => screen.getByRole('button', { name });

describe('WeekSlotsFrame: one week of free starts', () => {
  it('cannot go before the first week; next moves one week on', () => {
    const onWeek = open();
    expect(button(t.schedule.prevWeek)).toHaveProperty('disabled', true);
    fireEvent.click(button(t.schedule.nextWeek));
    expect(onWeek).toHaveBeenCalledWith(NEXT);
  });

  it('a later week goes back one week', () => {
    const onWeek = open({ week: NEXT });
    fireEvent.click(button(t.schedule.prevWeek));
    expect(onWeek).toHaveBeenCalledWith(FIRST);
  });

  it('names the viewer zone when the student shares it', () => {
    open();
    const note = t.schedule.zoneNote.split('{city}')[0] ?? '';
    expect(screen.getByText((text) => text.startsWith(note))).toBeTruthy();
  });

  it('names the student zone when it differs', () => {
    const other = viewerTz() === 'Pacific/Auckland' ? 'Asia/Tokyo' : 'Pacific/Auckland';
    open({ studentTz: other });
    const legend = t.booking.slotLegendViewer.split('{city}')[0] ?? '';
    expect(screen.getByText((text) => text.startsWith(legend))).toBeTruthy();
  });

  it('shows the error, the loading and the empty states', () => {
    open({ read: { data: undefined, isError: true } });
    expect(screen.getByText(t.booking.slotsError)).toBeTruthy();
    open({ read: { data: undefined, isError: false } });
    expect(screen.getByText(t.common.loading)).toBeTruthy();
    open({ read: { data: [], isError: false } });
    expect(screen.getByText(t.booking.noSlots)).toBeTruthy();
  });

  it('shows the grid, dimmed and busy while the next week loads', () => {
    open({ read: { data: [{ ...SLOT, conflicts: [] }], isError: false, dim: true } });
    const grid = screen.getByRole('group', { name: t.booking.freeSlots });
    expect(grid.parentElement?.getAttribute('aria-busy')).toBe('true');
  });
});
