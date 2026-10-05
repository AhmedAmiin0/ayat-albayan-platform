import { roleCreateSchema, type RoleCreateInput, type RoleView, type UserRole } from '@ab/shared';
import { t } from '@/lib/i18n';
import { normalize } from './matrix';

export interface RoleForm {
  key: string;
  nameAr: string;
  nameEn: string;
  base: UserRole;
  permissions: RoleView['permissions'];
}

export type RoleFormErrors = Partial<Record<'key' | 'nameAr' | 'nameEn', string>>;

export const emptyForm = (): RoleForm => ({ key: '', nameAr: '', nameEn: '', base: 'admin', permissions: [] });

export const formOf = (r: RoleView): RoleForm => ({
  key: r.key,
  nameAr: r.name_ar,
  nameEn: r.name_en,
  base: r.base_role,
  permissions: normalize(r.permissions),
});

const FIELD: Record<string, keyof RoleFormErrors> = { key: 'key', name_ar: 'nameAr', name_en: 'nameEn' };

/** Validates with the API's own schema, so the screen and the server agree. */
export function toBody(form: RoleForm): { ok: true; body: RoleCreateInput } | { ok: false; errors: RoleFormErrors } {
  const parsed = roleCreateSchema.safeParse({
    key: form.key.trim(),
    name_ar: form.nameAr,
    name_en: form.nameEn,
    base_role: form.base,
    permissions: form.permissions,
  });
  if (parsed.success) return { ok: true, body: parsed.data };
  const errors: RoleFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = FIELD[String(issue.path[0])];
    if (field) errors[field] = field === 'key' ? t.roles.form.keyHint : t.common.required;
  }
  return { ok: false, errors };
}

/** «finance clerk» typed as an English name → `finance_clerk`: a starting point for the key. */
export const suggestKey = (nameEn: string): string =>
  nameEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[0-9_]+/, '').slice(0, 40);
