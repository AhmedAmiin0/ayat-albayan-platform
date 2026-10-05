// The settings registry's vocabulary (owner, 2026-10-05 «dynamic configurations»): one entry per
// row of public.settings. The PATCH schema, the read validators, the defaults, the typed
// AcademySettings and the admin page's fields are all generated from these entries.

/** The /admin/settings sections, in page order. `appearance` holds no setting rows (theme is per browser). */
export const SETTINGS_SECTIONS = [
  'messaging',
  'schedule',
  'classroom',
  'reports',
  'accounts',
  'uploads',
  'academy',
  'sales',
  'appearance',
] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number];

interface Base {
  section: SettingsSectionId;
  /** Dotted path into ar.json / en.json (e.g. 'settings.bookingHorizonWeeks'). */
  labelKey: string;
  hintKey?: string;
  /** Returned by GET /settings/public (no login): only values safe for anyone to read. */
  public?: boolean;
  /** false: the page shows it with its own control (a switch with a confirmation), not the generic field. */
  form?: boolean;
}

/** A whole number in [min, max]. nullable: null = the policy is OFF (late_cancel_hours). */
export interface IntDef extends Base {
  type: 'int';
  default: number | null;
  min: number;
  max: number;
  nullable?: boolean;
  /** nullable only: the switch's label/hint and the number shown when it is turned ON. */
  toggleLabelKey?: string;
  toggleHintKey?: string;
  onValue?: number;
}
export interface BoolDef extends Base {
  type: 'bool';
  default: boolean;
}
/** Free text (trimmed) of minLength..maxLength characters. */
export interface StringDef extends Base {
  type: 'string';
  default: string;
  minLength: number;
  maxLength: number;
}
/** E.164 phone (rule 7), an IANA time zone, or an ISO 4217 code: validated by kind. */
export interface FormatDef extends Base {
  type: 'e164' | 'tz' | 'currency';
  default: string;
}
/** Non-empty, strictly ascending whole numbers in [min, max] (R-LEAD-05 follow-up hours). */
export interface IntListDef extends Base {
  type: 'int_list';
  default: readonly number[];
  min: number;
  max: number;
  maxItems: number;
}
export interface EnumDef extends Base {
  type: 'enum';
  default: string;
  options: readonly string[];
}

export type SettingDef = IntDef | BoolDef | StringDef | FormatDef | IntListDef | EnumDef;

/** The stored value's TypeScript type for one entry. */
export type SettingValue<D> = D extends { type: 'int'; nullable: true }
  ? number | null
  : D extends { type: 'int' }
    ? number
    : D extends { type: 'bool' }
      ? boolean
      : D extends { type: 'int_list' }
        ? number[]
        : D extends { type: 'enum'; options: readonly (infer O)[] }
          ? O
          : string;

/** snake_case row key → camelCase PATCH field ('reminder_24h_enabled' → 'reminder24hEnabled'). */
export type CamelKey<S extends string> = S extends `${infer H}_${infer T}` ? `${H}${CamelKey<Capitalize<T>>}` : S;

export const camelKey = <S extends string>(key: S): CamelKey<S> =>
  key.replace(/_(.)/g, (_m, c: string) => c.toUpperCase()) as CamelKey<S>;
