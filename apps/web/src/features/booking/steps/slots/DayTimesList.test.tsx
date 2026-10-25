import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { dayAtText, DayTimesList } from './DayTimesList';

const SUN = { at: '2026-10-04T14:00:00.000Z', weekday: 0, time: '17:00' };
const TUE = { at: '2026-10-06T16:30:00.000Z', weekday: 2, time: '19:30' };
const dayAt = (day: number, time: string) => t.booking.dayAt.replace('{day}', t.enums.weekday[day as 0]).replace('{time}', time);

describe('DayTimesList (owner 2026-10-18: a time per day)', () => {
  it('reads «الأحد الساعة 17:00», with the family city when not Riyadh', () => {
    expect(dayAtText(SUN)).toBe(dayAt(0, '17:00'));
    expect(dayAtText(SUN, 'Africa/Cairo')).toBe(dayAt(0, t.schedule.inCity.replace('{time}', '17:00').replace('{city}', t.tz['Africa/Cairo'])));
  });

  it('lists each day with its own remove button', () => {
    const onRemove = vi.fn();
    render(<DayTimesList picks={[SUN, TUE]} tz="Asia/Riyadh" onRemove={onRemove} />);
    expect(screen.getByText(dayAt(0, '17:00'))).toBeTruthy();
    expect(screen.getByText(dayAt(2, '19:30'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.removeDay.replace('{day}', t.enums.weekday[2]) }));
    expect(onRemove).toHaveBeenCalledWith(TUE.at);
  });

  it('says so while nothing is picked', () => {
    render(<DayTimesList picks={[]} tz="Asia/Riyadh" onRemove={vi.fn()} />);
    expect(screen.getByText(t.booking.noDayPicked)).toBeTruthy();
  });
});
