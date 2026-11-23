import { useState } from 'react';
import { dayId } from '#/features/schedule/day-text.ts';

// A tap on the week strip: the agenda scrolls to that day (at once under reduced motion) and its
// ring flashes once (opacity only, kept under reduced motion: it says where the eye should land).

const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** «700ms» / «0.7s» → milliseconds; 0 when the token cannot be read. */
function msOf(value: string): number {
  const n = Number.parseFloat(value);
  const scale = value.trim().endsWith('ms') ? 1 : 1000;
  return Number.isFinite(n) ? n * scale : 0;
}

function flash(section: HTMLElement): void {
  const ring = section.querySelector<HTMLElement>('[data-flash]');
  if (!ring || typeof ring.animate !== 'function') return;
  const tokens = getComputedStyle(document.documentElement);
  ring.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: msOf(tokens.getPropertyValue('--duration-flash')),
    easing: tokens.getPropertyValue('--ease-ink').trim() || 'ease-out',
  });
}

function scrollToDay(day: string): void {
  const section = document.getElementById(dayId(day));
  if (!section) return;
  section.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  // Keyboard and screen-reader users land on the day too (it is tabIndex -1).
  section.focus({ preventScroll: true });
  flash(section);
}

/** The strip's chosen day (none until a tap; the week body is keyed on the week, so it resets). */
export function useJumpToDay() {
  const [selected, setSelected] = useState<string | null>(null);
  const jump = (day: string) => {
    setSelected(day);
    scrollToDay(day);
  };
  return { selected, jump };
}
