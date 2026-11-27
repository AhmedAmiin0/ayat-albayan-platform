import { describe, expect, it } from 'vitest';
import type { AuthUser, Role } from '@/common/auth/verify-token';
import { requireAdmin } from './channel-access';

const user = (role: Role): AuthUser => ({ id: 'p-1', email: null, role });

describe('requireAdmin: moderation and presence of any chat are the admin’s alone', () => {
  it('lets the admin through', () => {
    expect(() => requireAdmin(user('admin'), 'moderation_admin_only')).not.toThrow();
  });

  it('refuses another monitor with the given code', () => {
    expect(() => requireAdmin(user('sales'), 'presence_admin_only')).toThrow(
      expect.objectContaining({ status: 403, message: 'presence_admin_only' }),
    );
  });
});
