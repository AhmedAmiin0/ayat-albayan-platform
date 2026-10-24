import type { ConfigEntry, Locale, Permission, SettingOwner } from '@ab/shared';

// «الوصف» of a value (docs/26 §3): what the row's muted line shows, and who may edit it.

/** A dotted ar.json / en.json path → its string in `bundle`; undefined when it is not a string. */
export function textIn(bundle: object, path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const v = path.split('.').reduce<unknown>((node, k) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[k] : undefined), bundle);
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

export interface DescriptionInput {
  entry: ConfigEntry | undefined;
  /** The registry hint key (the entry's, else the code's). */
  hintKey: string | null | undefined;
  locale: Locale;
  /** `t` (the bundle with the overrides already applied). */
  bundle: object;
}

/**
 * The text shown. Arabic: the admin's description, else t(hintKey) (t already holds the override),
 * else the seeded text. English: t(hintKey) only (English is edited on «الترجمات»).
 */
export function shownDescription({ entry, hintKey, locale, bundle }: DescriptionInput): string | undefined {
  const hint = textIn(bundle, entry?.hintKey ?? hintKey);
  if (locale === 'en') return hint;
  return entry?.description ?? hint ?? entry?.descriptionSeed ?? undefined;
}

/** The Arabic text the editor starts from (the stored one, else what Arabic readers see today). */
export function editorStart(input: DescriptionInput): string {
  if (input.locale === 'ar') return shownDescription(input) ?? '';
  return input.entry?.description ?? input.entry?.descriptionSeed ?? '';
}

export interface DescribeRights {
  can: (permission: Permission) => boolean;
  /** The base admin role (the Google rows). */
  baseAdmin: boolean;
}

/** Who may write an owned key's description: the owning module's permission (docs/26 §2f). */
const OWNER_RIGHT: Record<SettingOwner, (r: DescribeRights) => boolean> = {
  messages_gate: (r) => r.can('settings.write'),
  communications: (r) => r.can('numbers.manage'),
  google_sync: (r) => r.baseAdmin,
};

/** Can this user edit the row's description? Never without an API row (nothing to write to). */
export function canEditDescription(entry: ConfigEntry | undefined, rights: DescribeRights): boolean {
  if (!entry || entry.retired) return false;
  if (entry.ownedBy) return OWNER_RIGHT[entry.ownedBy](rights);
  return rights.can('settings.write');
}
