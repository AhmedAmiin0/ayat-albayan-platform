import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { catalogueMatch } from './catalogue-match';

describe('catalogueMatch (the settings search over «الإشعارات»)', () => {
  it('matches the section by its title or intro, its old name, and an empty search', () => {
    expect(catalogueMatch(t.notificationRules.title)).toBe(true);
    expect(catalogueMatch(t.notificationRules.intro)).toBe(true);
    expect(catalogueMatch(t.notificationCatalogue.title)).toBe(true);
    expect(catalogueMatch('')).toBe(true);
  });

  it('not the old read-only intro («للاطلاع فقط»), nothing else', () => {
    expect(catalogueMatch(t.notificationCatalogue.intro)).toBe(false);
    expect(catalogueMatch(t.notificationCatalogue.readOnly)).toBe(false);
    expect(catalogueMatch('zzzz-nothing')).toBe(false);
    expect(catalogueMatch(t.templates.settings.lines.title)).toBe(false);
  });
});
