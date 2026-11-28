import { describe, expect, it } from 'vitest';
import * as rails from './rail';

describe('rail classes (docs/66 section 1)', () => {
  it('keeps only the inbox list pane and the wide thread panel', () => {
    expect(Object.keys(rails).sort()).toEqual(['paneScroll', 'railThread']);
  });

  it('each scrolls only from its own breakpoint up, never as a sticky page rail', () => {
    for (const cls of [rails.paneScroll, rails.railThread]) {
      expect(cls).not.toMatch(/sticky/);
      for (const token of cls.split(' ').filter((c) => c.includes('overflow'))) {
        expect(token).toMatch(/^(shell|@3xl\/thread):/);
      }
    }
  });
});
