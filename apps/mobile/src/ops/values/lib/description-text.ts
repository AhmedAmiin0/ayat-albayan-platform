import { DESCRIPTION_MAX, type ConfigEntry, type Locale, type Permission } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

// «القيم» on the phone: a key's description (docs/26 §3) and who may edit it (§2f, §5).

export interface DescriptionSource {
  /** The row of GET /config/entries; undefined on an older API (no route) or while loading. */
  entry: ConfigEntry | undefined;
  /** Today's text: the registry hint through `t` (with the admins' overrides). */
  hint: string | undefined;
  locale: Locale;
}

/**
 * The text the sheet shows. Arabic: the admin's description, else the hint (with overrides), else the
 * seed. English: the hint only (English descriptions are edited on «الترجمات», docs/26 §3).
 */
export function descriptionOf({ entry, hint, locale }: DescriptionSource): string | undefined {
  if (locale !== 'ar' || !entry) return hint;
  return entry.description ?? hint ?? entry.descriptionSeed ?? undefined;
}

export interface DescribeAccess {
  entry: ConfigEntry | undefined;
  can: (permission: Permission) => boolean;
  /** /auth/me is a base-role admin. */
  admin: boolean;
}

/**
 * «عدّل الوصف»: settings.write, and on a module-owned key that module's permission
 * (messages_gate → settings.write, communications → numbers.manage, google_sync → base admin,
 * notifications → notifications.manage).
 * Without a row (older API) there is nothing to edit.
 */
export function canDescribe({ entry, can, admin }: DescribeAccess): boolean {
  if (!entry || !can('settings.write')) return false;
  if (entry.ownedBy === 'communications') return can('numbers.manage');
  if (entry.ownedBy === 'google_sync') return admin;
  if (entry.ownedBy === 'notifications') return can('notifications.manage');
  return true;
}

/** The editor's check before sending: the trimmed text, or the line to show. */
export function checkDescription(text: string): { ok: true; text: string } | { ok: false; error: string } {
  const trimmed = text.trim();
  const d = t.mobileValues.description;
  if (trimmed === '') return { ok: false, error: d.required };
  if (trimmed.length > DESCRIPTION_MAX) return { ok: false, error: d.tooLong.replace('{max}', String(DESCRIPTION_MAX)) };
  return { ok: true, text: trimmed };
}

/** A failed PUT as one line inside the sheet. */
export function describeError(e: unknown): string {
  const d = t.mobileValues.description;
  if (e instanceof ApiError && e.status === 403) return d.forbidden;
  if (e instanceof ApiError && (e.status === 400 || e.status === 422)) return d.invalid;
  return d.saveFailed;
}

/** «{n} / 500». */
export const counterText = (text: string): string =>
  t.mobileValues.description.counter.replace('{n}', String(text.length)).replace('{max}', String(DESCRIPTION_MAX));
