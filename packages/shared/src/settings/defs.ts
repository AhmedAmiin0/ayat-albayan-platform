// The settings registry's vocabulary (owner, 2026-10-05 «dynamic configurations»): one entry per
// row of public.settings. The PATCH schema, the read validators, the defaults, the typed
// AcademySettings and the admin page's fields are all generated from these entries. Where a row
// shows on /admin/settings is not part of its entry: layout.ts holds the page order.

import type { SettingConfirm, SettingGroup } from './groups.js';
import type { SettingOwner } from './ownership.js';

interface Base {
  /** Dotted path into ar.json / en.json (e.g. 'settings.bookingHorizonWeeks'). */
  labelKey: string;
  hintKey?: string;
  /** Returned by GET /settings/public (no login): only values safe for anyone to read. */
  public?: boolean;
  /** false: the page shows it with its own control (a switch with a confirmation), not the generic field. */
  form?: boolean;
  /** false: PATCH /settings ignores it; only its own guarded endpoint writes it (comms_source). */
  patch?: boolean;
  // docs/26 §2b seed metadata (inert until the 26-P2 seeder). Typed optional so a bare def (tests)
  // still fits; seed-entries.test.ts requires module and group on every registry entry.
  /** The owning module: the domain file's name (follow_ups for follow-ups.ts). */
  module?: string;
  /** Its «القيم» group (docs/26b §2). */
  group?: SettingGroup;
  /** The confirmation asked before a change is saved (owner defaults, 2026-10-23). */
  confirm?: SettingConfirm;
  /** The module page that edits it when that is not «القيم» (the same owner as OWNED_SETTING_KEYS). */
  ownedBy?: SettingOwner;
  /**
   * true: changing it changes a message families, guardians or leads receive, or a page, link, number or
   * lesson balance they see (send switches, reminders, follow-ups, feedback, join window, contact block).
   * Left out for staff-only values (teacher messages, payouts, money reports, internal flags).
   */
  reachesFamilies?: boolean;
  /** Kept readable, no longer used: the seeder sets retired_at (only an explicit flag retires a row). */
  retired?: true;
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

/** One field of a `json` entry's object value (all optional; an empty box is left out). */
export interface ShapeField {
  name: string;
  kind: 'string' | 'text';
  format?: 'e164' | 'email' | 'host';
  max?: number;
}

/** An object of short strings (contact block, bilingual notice); null = unset when nullable. */
export interface JsonDef extends Base {
  type: 'json';
  default: Readonly<Record<string, string>> | null;
  shape: readonly ShapeField[];
  nullable?: boolean;
}

export type SettingDef = IntDef | BoolDef | StringDef | FormatDef | IntListDef | EnumDef | JsonDef;

/** The stored value's TypeScript type for one entry. */
export type SettingValue<D> = D extends { type: 'json'; nullable: true }
  ? Record<string, string> | null
  : D extends { type: 'json' }
    ? Record<string, string>
    : D extends { type: 'int'; nullable: true }
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

/** One typed object of a registry slice (a domain file's entries → their stored values). */
export type SettingsOf<R extends Record<string, SettingDef>> = { -readonly [K in keyof R]: SettingValue<R[K]> };
