import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { catalogueMatch } from './catalogue-match';

describe('catalogueMatch (the settings search over «ماذا يُرسل ومتى»)', () => {
  it('matches the section by its title or intro, and an empty search', () => {
    expect(catalogueMatch(t.notificationCatalogue.title)).toBe(true);
    expect(catalogueMatch(t.notificationCatalogue.intro)).toBe(true);
    expect(catalogueMatch('')).toBe(true);
  });

  it('nothing else', () => {
    expect(catalogueMatch('zzzz-nothing')).toBe(false);
    expect(catalogueMatch(t.templates.settings.lines.title)).toBe(false);
  });
});
