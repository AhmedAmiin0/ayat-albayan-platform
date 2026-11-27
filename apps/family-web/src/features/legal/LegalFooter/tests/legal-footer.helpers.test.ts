import { describe, expect, it } from 'vitest';
import { otherLegalPages } from '@/features/legal/LegalFooter/legal-footer.helpers';

describe('otherLegalPages', () => {
  it('leaves out the page in view and keeps the rest in order', () => {
    expect(otherLegalPages('privacy')).toEqual(['deleteAccount']);
    expect(otherLegalPages('deleteAccount')).toEqual(['privacy']);
  });
});
