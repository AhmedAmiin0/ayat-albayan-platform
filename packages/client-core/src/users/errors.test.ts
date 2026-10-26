import { describe, expect, it } from 'vitest';
import { ApiError, userErrors } from '../index.js';

const errors = userErrors(() => ({ errors: { generic: 'عام', users_email_taken: 'مأخوذ' }, tables: { lessons: 'الحلقات' } }));

describe('userErrors', () => {
  it('maps the API code, the generic text for anything else', () => {
    expect(errors.userErrorText(new ApiError(409, { code: 'users_email_taken' }))).toBe('مأخوذ');
    expect(errors.userErrorText(new ApiError(500, null))).toBe('عام');
    expect(errors.userErrorText(new Error('x'))).toBe('عام');
  });

  it('history references only for users_has_history', () => {
    const refs = [{ table: 'lessons', count: 2 }];
    expect(errors.historyReferences(new ApiError(409, { code: 'users_has_history', references: refs }))).toEqual(refs);
    expect(errors.historyReferences(new ApiError(409, { code: 'users_has_history' }))).toEqual([]);
    expect(errors.historyReferences(new ApiError(409, { code: 'other' }))).toBeNull();
  });

  it('a table label, or the raw name', () => {
    expect(errors.tableLabel('lessons')).toBe('الحلقات');
    expect(errors.tableLabel('payouts')).toBe('payouts');
  });
});
