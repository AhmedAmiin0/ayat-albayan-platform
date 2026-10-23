import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { templatesMatch } from './templates-match';

describe('templatesMatch (the settings search over «قوالب واتساب»)', () => {
  it('matches the section by its title, intro and per-number words, and an empty search', () => {
    expect(templatesMatch(t.templates.title)).toBe(true);
    expect(templatesMatch(t.templates.intro)).toBe(true);
    expect(templatesMatch(t.templates.perNumber.title)).toBe(true);
    expect(templatesMatch(t.templates.perNumber.sync)).toBe(true);
    expect(templatesMatch('')).toBe(true);
  });

  it('nothing else', () => {
    expect(templatesMatch('zzzz-nothing')).toBe(false);
    expect(templatesMatch(t.notificationCatalogue.title)).toBe(false);
  });
});
