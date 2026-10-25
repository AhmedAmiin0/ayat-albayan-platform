import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { historyReferences, tableLabel, userErrorText } from './errors';

describe('user errors', () => {
  it('maps each API code to its message', () => {
    expect(userErrorText(new ApiError(409, { code: 'email_taken' }))).toBe(t.users.errors.email_taken);
    expect(userErrorText(new ApiError(409, { code: 'link_taken' }))).toBe(t.users.errors.link_taken);
    expect(userErrorText(new ApiError(403, { code: 'permission_not_held' }))).toBe(t.users.errors.permission_not_held);
  });
  it('has a message for every code the users API answers', () => {
    const codes = ['self_lockout', 'phone_taken', 'password_blank', 'password_too_short', 'password_too_long', 'link_target_not_found', 'unknown_role',
      'role_mismatch', 'system_admin_only', 'admin_role_only', 'invalid_email', 'user_not_found', 'account_disabled', 'cannot_delete_self'];
    for (const code of codes) {
      const text = userErrorText(new ApiError(409, { code }));
      expect(text).toBe(t.users.errors[code as keyof typeof t.users.errors]);
      expect(text).not.toBe(t.users.errors.generic);
    }
  });
  it('falls back to the generic message', () => {
    expect(userErrorText(new ApiError(500, { code: 'weird' }))).toBe(t.users.errors.generic);
    expect(userErrorText(new ApiError(500, null))).toBe(t.users.errors.generic);
    expect(userErrorText(new Error('x'))).toBe(t.users.errors.generic);
  });
  it('reads the references of users_has_history only', () => {
    const refs = [{ table: 'payments', column: 'created_by', count: 3 }];
    expect(historyReferences(new ApiError(409, { code: 'users_has_history', references: refs }))).toEqual(refs);
    expect(historyReferences(new ApiError(409, { code: 'last_admin' }))).toBeNull();
    expect(historyReferences(new ApiError(409, { code: 'users_has_history' }))).toEqual([]);
  });
  it('names a table, or keeps the raw name', () => {
    expect(tableLabel('payments')).toBe(t.users.tables.payments);
    expect(tableLabel('some_new_table')).toBe('some_new_table');
  });
});
