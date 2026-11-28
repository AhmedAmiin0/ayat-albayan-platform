import { describe, expect, it } from 'vitest';
import { hamishMeta } from './DataTable';

// A long note pushed the table past its box, so the column was cut at the edge (docs/65 UX-6).
describe('hamish column', () => {
  it('lets a long note wrap inside its cell', () => {
    expect(hamishMeta.className).toContain('whitespace-normal');
    expect(hamishMeta.className).toContain('min-w-40');
  });

  it('keeps the heading on one line', () => {
    expect(hamishMeta.headClassName).not.toContain('whitespace-normal');
  });
});
