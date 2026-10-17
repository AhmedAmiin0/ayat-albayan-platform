import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { templateErrorText } from './api';

// docs/19: a refused Kapso key has its own words; only meta_error names Meta.

describe('templateErrorText', () => {
  it('kapso_auth reads templates.error.kapso_auth, never the meta_error sentence', () => {
    const text = templateErrorText(new ApiError(502, { code: 'kapso_auth', message: 'kapso_auth' }));
    expect(text).toBe(t.templates.error.kapso_auth);
    expect(text).not.toBe(t.templates.error.meta_error.replace('{message}', '—'));
  });

  it('meta_error keeps Meta’s own message', () => {
    const error = new ApiError(502, { code: 'meta_error', message: 'meta_error', meta_code: 100, meta_message: 'already exists' });
    expect(templateErrorText(error)).toBe(t.templates.error.meta_error.replace('{message}', 'already exists'));
  });
});
