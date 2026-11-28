import { describe, expect, it } from 'vitest';
import { leadGridClass } from './LeadListItem';

describe('lead row grid', () => {
  it('gives the status column room for the longest status chip (docs/65 UX-6)', () => {
    expect(leadGridClass).toContain('_196px_');
  });
});
