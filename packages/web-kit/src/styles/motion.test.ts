import { describe, expect, it } from 'vitest';
import motion from './motion.css?raw';
import index from '#/index.css?raw';

// Owner, 2026-10-05: fast (120–220 ms), ease-out, and nothing moves under reduced motion;
// 2026-11-19: one curve and named durations, no literal timing in the components.
describe('motion.css', () => {
  const entrances = [...motion.matchAll(/--animate-([a-z-]+): \S+ (\d+)ms (\S+)/g)];
  const durations = Object.fromEntries(
    [...motion.matchAll(/--duration-([a-z]+): (\d+)ms;/g)].map((m) => [m[1], Number(m[2])]),
  );

  it('defines the entrance animations the UI uses', () => {
    const names = entrances.map((m) => m[1]).sort();
    expect(names).toEqual(['drawer-in', 'drop-in', 'fade-in', 'fade-up', 'pop-in', 'toast-in']);
  });

  it.each(entrances.map((m) => [m[1], Number(m[2])] as const))('%s lasts 120–220 ms', (_n, ms) => {
    expect(ms).toBeGreaterThanOrEqual(120);
    expect(ms).toBeLessThanOrEqual(220);
  });

  it('every entrance runs on the one curve, --ease-ink', () => {
    expect(entrances.map((m) => m[3])).toEqual(entrances.map(() => 'var(--ease-ink)'));
    expect(motion.match(/cubic-bezier\(/g)).toHaveLength(1);
  });

  it('names the durations: press < quick < enter < move, all UI ones under 300 ms', () => {
    expect(Object.keys(durations).sort()).toEqual(['enter', 'flash', 'move', 'press', 'quick']);
    const ui = [durations.press, durations.quick, durations.enter, durations.move];
    expect(ui).toEqual([...ui].sort((a = 0, b = 0) => a - b));
    expect(Math.max(...ui.map(Number))).toBeLessThan(300);
  });

  it('is imported by index.css, whose reduced-motion rule stops every animation and transition', () => {
    expect(index).toContain("@import './styles/motion.css';");
    const reduce = index.slice(index.indexOf('prefers-reduced-motion: reduce'));
    expect(reduce).toMatch(/animation: none !important/);
    expect(reduce).toMatch(/transition: none !important/);
  });

  it('the hover lift and the press only move when motion is welcome', () => {
    expect(motion).toMatch(/prefers-reduced-motion: no-preference\)\s*\{\s*\.ab-lift:hover/);
    expect(motion).toMatch(/prefers-reduced-motion: no-preference\)\s*\{\s*\.ab-press:active/);
  });
});
