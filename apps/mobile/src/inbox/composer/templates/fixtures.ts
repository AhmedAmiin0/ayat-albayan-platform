import type { AuthorTemplate } from '@ab/client-core';
import type { UserRole } from '@ab/shared';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient } from '@/test/query';
import { fullAccessMe } from '@/test/staff-me';

// «القوالب» tests (owner 2026-11-14): templates and a signed-in sales user or admin.

export const ME = 'u-1';

export const tpl = (over: Partial<AuthorTemplate> = {}): AuthorTemplate => ({
  key: 'summer_offer', meta_name: 'summer_offer', language: 'ar', category: 'marketing',
  header_format: null, body_ar: 'عرض خاص يا {{1}} هذا الشهر', footer_ar: null, params: ['var_1'],
  buttons: [], display: null, status: 'approved', last_error: null, line: 'chat',
  sales_starter: true, created_by: null, approved_edits: [],
  ...over,
});

/** A query client signed in as `role`: sales hold templates.author; the admin everything. */
export function clientAs(role: Extract<UserRole, 'sales' | 'admin'>) {
  const client = createTestQueryClient();
  const me = fullAccessMe(role);
  const sales = me.permissions.filter((p) => p !== 'templates.manage');
  const permissions = role === 'admin' ? me.permissions : sales;
  client.setQueryData(pathKey('/auth/me'), { ...me, id: ME, permissions });
  return client;
}
