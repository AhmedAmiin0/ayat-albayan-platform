import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { linesMatch } from './lines-match';

describe('linesMatch (the settings search over «أرقام واتساب»)', () => {
  it('matches the card by its title or intro, and an empty search', () => {
    expect(linesMatch(t.templates.settings.lines.title)).toBe(true);
    expect(linesMatch(t.templates.settings.lines.intro)).toBe(true);
    expect(linesMatch('  ')).toBe(true);
  });

  it('nothing else', () => {
    expect(linesMatch('zzzz-nothing')).toBe(false);
    expect(linesMatch(t.notificationCatalogue.title)).toBe(false);
  });
});
