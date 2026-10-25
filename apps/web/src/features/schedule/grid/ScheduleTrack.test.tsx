import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScheduleTrack } from './ScheduleTrack';

const marks = (track: Element) => [...track.querySelectorAll('span')] as HTMLElement[];

describe('ScheduleTrack (visual only, 08–24)', () => {
  it('draws hours, time off and lesson ticks from the inline-start; hidden from screen readers', () => {
    const { container } = render(
      <ScheduleTrack
        windows={[{ start: '16:00', end: '20:00' }, { start: '22:00', end: '24:00' }]}
        off={[{ start: '12:00', end: '14:00' }]}
        ticks={[{ start: '17:00', end: '17:45' }]}
      />,
    );
    const track = container.firstElementChild as HTMLElement;
    expect(track.getAttribute('aria-hidden')).toBe('true');
    const [day, night, off, tick] = marks(track);
    expect([day, night, off, tick].every(Boolean)).toBe(true);
    expect(day?.style.insetInlineStart).toBe('50%');
    expect(night?.style.width).toBe('12.5%'); // 22:00 → midnight ends at 100%
    expect(off?.style.backgroundImage).toContain('repeating-linear-gradient');
    expect(tick?.className).toContain('bg-ink-2');
  });

  it('skips anything before 08:00', () => {
    const { container } = render(<ScheduleTrack windows={[{ start: '05:00', end: '07:00' }]} off={[]} ticks={[]} />);
    expect(marks(container.firstElementChild as HTMLElement)).toHaveLength(0);
  });
});
