import type { TemplateSkipReason } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import ar from '@ab/shared/i18n/ar.json';
import en from '@ab/shared/i18n/en.json';
import { t } from '@/lib/i18n/i18n';
import { skipReasonText } from './skip-reasons';

// Every reason code the API sends reads in the admin's language (rule 10), never the API's English.

const EVERY: Record<TemplateSkipReason['code'], TemplateSkipReason> = {
  category: { code: 'category', category: 'AUTHENTICATION' },
  too_many_vars: { code: 'too_many_vars', max: 9 },
  bad_key: { code: 'bad_key' },
  media_header: { code: 'media_header' },
  no_body: { code: 'no_body' },
  named_vars: { code: 'named_vars' },
  button_value: { code: 'button_value' },
  key_taken: { code: 'key_taken' },
};

describe('skipReasonText', () => {
  it('every code has its Arabic and English words, params filled', () => {
    for (const reason of Object.values(EVERY)) {
      const text = skipReasonText(reason);
      expect(text).toBeTruthy();
      expect(text).not.toMatch(/\{\w+\}/);
      expect(Object.keys(ar.templates.perNumber.skipReasons)).toContain(reason.code);
      expect(Object.keys(en.templates.perNumber.skipReasons)).toContain(reason.code);
    }
  });

  it('fills {category} and {max}', () => {
    expect(skipReasonText(EVERY.category)).toBe(t.templates.perNumber.skipReasons.category.replace('{category}', 'AUTHENTICATION'));
    expect(skipReasonText(EVERY.too_many_vars)).toBe(t.templates.perNumber.skipReasons.too_many_vars.replace('{max}', '9'));
    expect(skipReasonText(EVERY.no_body)).toBe(t.templates.perNumber.skipReasons.no_body);
  });
});
