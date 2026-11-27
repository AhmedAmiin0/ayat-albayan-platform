import type { TemplateView } from '@ab/shared';
import type { UserRole } from '@ab/catalog';
import { pathKey } from '@ab/mobile-kit';
import { createTestQueryClient } from '@/test/query';
import { fullAccessMe } from '@/test/staff-me';

export const ME = 'a0000000-0000-4000-8000-000000000001';

export const tpl = (over: Partial<TemplateView> = {}): TemplateView => ({
  key: 'summer_offer', meta_name: 'summer_offer', language: 'ar', category: 'marketing',
  header_format: null, body_ar: 'عرض خاص يا {{1}} هذا الشهر', footer_ar: null, params: ['var_1'],
  buttons: [], display: null, status: 'approved', quality: null, meta_id: null,
  last_checked_at: null, last_error: null, submitted_at: null, line: 'chat',
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
