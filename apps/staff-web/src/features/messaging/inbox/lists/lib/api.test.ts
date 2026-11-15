import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { listErrorText } from './api';

describe('listErrorText (docs/22 §3)', () => {
  it('the 409 codes: the name is taken, the 30-list limit', () => {
    expect(listErrorText(new ApiError(409, { code: 'list_name_taken' }))).toBe(t.inbox.lists.nameTaken);
    expect(listErrorText(new ApiError(409, { code: 'list_limit' }))).toBe(t.inbox.lists.limit);
  });

  it('a list deleted meanwhile (404) says so', () => {
    expect(listErrorText(new ApiError(404, { message: 'Not Found' }))).toBe(t.inbox.lists.notFound);
  });

  it('anything else: the generic save error', () => {
    expect(listErrorText(new ApiError(500))).toBe(t.inbox.lists.saveError);
    expect(listErrorText(new ApiError(409, 'conflict'))).toBe(t.inbox.lists.saveError);
    expect(listErrorText(new Error('offline'))).toBe(t.inbox.lists.saveError);
  });
});
