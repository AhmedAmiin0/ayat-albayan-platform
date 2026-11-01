import { describe, expect, it } from 'vitest';
import motion from './motion.css?raw';
import index from '@/index.css?raw';

// Owner, 2026-10-05: fast (120–220 ms), ease-out, and nothing moves under reduced motion.
describe('motion.css', () => {
  const entrances = [...motion.matchAll(/--animate-([a-z-]+): \S+ (\d+)ms/g)];

  it('defines the entrance animations the UI uses', () => {
    expect(entrances.map((m) => m[1]).sort()).toEqual(['drawer-in', 'fade-in', 'fade-up', 'pop-in', 'toast-in']);
  });

  it.each(entrances.map((m) => [m[1], Number(m[2])] as const))('%s lasts 120–220 ms', (_name, ms) => {
    expect(ms).toBeGreaterThanOrEqual(120);
    expect(ms).toBeLessThanOrEqual(220);
  });

  it('is imported by index.css, whose reduced-motion rule stops every animation and transition', () => {
    expect(index).toContain("@import './styles/motion.css';");
    const reduce = index.slice(index.indexOf('prefers-reduced-motion: reduce'));
    expect(reduce).toMatch(/animation: none !important/);
    expect(reduce).toMatch(/transition: none !important/);
  });

  it('the hover lift only moves when motion is welcome', () => {
    expect(motion).toMatch(/prefers-reduced-motion: no-preference\)\s*\{\s*\.ab-lift:hover/);
  });
});
