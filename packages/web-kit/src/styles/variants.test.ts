import { describe, expect, it } from 'vitest';
import index from '@ab/web-kit/index.css?raw';

describe('index.css custom variants', () => {
  it('tall: needs a window at least 40rem wide and 40rem high', () => {
    expect(index).toContain(
      '@custom-variant tall (@media (min-width: 40rem) and (min-height: 40rem));',
    );
  });

  it('tall: is defined once', () => {
    expect(index.match(/@custom-variant tall /g)).toHaveLength(1);
  });
});
