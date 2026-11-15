import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { lineSyncErrorText, templateErrorText } from './api';

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

  it('crm_scope_missing names the scope the CRM key lacks and where to update it (docs/39)', () => {
    const error = new ApiError(502, { code: 'crm_scope_missing', message: 'crm_scope_missing', scope: 'templates:write' });
    const text = templateErrorText(error);
    expect(text).toBe(t.templates.error.crm_scope_missing.replace('{scope}', 'templates:write'));
    expect(text).toContain('templates:write');
    expect(text).toContain('مفتاح واجهة نظام CRM');
  });

  it('a crm line\'s failed sync: the scope comes as its message', () => {
    const text = lineSyncErrorText({ line: 'notifications', error: 'crm_scope_missing', message: 'templates:read' });
    expect(text).toBe(t.templates.error.crm_scope_missing.replace('{scope}', 'templates:read'));
  });
});
