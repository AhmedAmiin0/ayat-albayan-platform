import type { Permission } from '@ab/catalog';
import type { Locale } from '@ab/core';
import { DESCRIPTION_MAX, type ConfigEntry } from '@ab/settings';
import { ApiError, t } from '@ab/mobile-kit';

// docs/26 §3 for descriptions; §2f and §5 for who may edit.

interface DescriptionSource {
  /** The row of GET /config/entries; undefined on an older API (no route) or while loading. */
  entry: ConfigEntry | undefined;
  /** Today's text: the registry hint through `t` (with the admins' overrides). */
  hint: string | undefined;
  locale: Locale;
}

/** English shows the hint only; English descriptions are edited on translations (docs/26 §3). */
export function descriptionOf({ entry, hint, locale }: DescriptionSource): string | undefined {
  if (locale !== 'ar' || !entry) return hint;
  return entry.description ?? hint ?? entry.descriptionSeed ?? undefined;
}

interface DescribeAccess {
  entry: ConfigEntry | undefined;
  can: (permission: Permission) => boolean;
  /** /auth/me is a base-role admin. */
  admin: boolean;
}

/** Module-owned keys also need that module's permission; without a row there is nothing to edit. */
export function canDescribe({ entry, can, admin }: DescribeAccess): boolean {
  if (!entry || !can('settings.write')) return false;
  if (entry.ownedBy === 'communications') return can('numbers.manage');
  if (entry.ownedBy === 'google_sync') return admin;
  if (entry.ownedBy === 'notifications') return can('notifications.manage');
  return true;
}

/** The editor's check before sending: the trimmed text, or the line to show. */
export function checkDescription(
  text: string,
): { ok: true; text: string } | { ok: false; error: string } {
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
