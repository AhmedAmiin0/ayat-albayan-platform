import { z } from 'zod';

// «تخصيص» on the teacher's «اليوم» (owner 2026-11-14): which alerts show, the ended lessons, the
// hero and the row density. Saved per device (web localStorage, mobile AsyncStorage); a server
// copy is a later option. Anything unreadable falls back field by field to the defaults.

export const ALERT_KINDS = ['soon', 'confirm', 'changed', 'report', 'bell'] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];
export const DENSITIES = ['comfortable', 'compact'] as const;
export type Density = (typeof DENSITIES)[number];

/** The storage key on both apps. */
export const HOME_PREFS_KEY = 'ab.teacher.home.v1';

const on = z.boolean().catch(true);

const alertsSchema = z
  .object({ soon: on, confirm: on, changed: on, report: on, bell: on })
  .catch({ soon: true, confirm: true, changed: true, report: true, bell: true });

export const homePrefsSchema = z.object({
  alerts: alertsSchema,
  ended: on,
  hero: on,
  density: z.enum(DENSITIES).catch('comfortable'),
});
export type HomePrefs = z.infer<typeof homePrefsSchema>;

/** Everything on, comfortable rows. */
export const DEFAULT_HOME_PREFS: HomePrefs = homePrefsSchema.parse({});

const decodeJson: (text: string) => unknown = JSON.parse;

const json = (raw: string): unknown => {
  try {
    return decodeJson(raw);
  } catch {
    return {};
  }
};

/** The saved text (null: nothing saved) as prefs; a broken or old value keeps every default. */
export const parseHomePrefs = (raw: string | null): HomePrefs =>
  homePrefsSchema.catch(DEFAULT_HOME_PREFS).parse(json(raw ?? '{}'));

/** One switch flipped. */
export const withAlert = (prefs: HomePrefs, kind: AlertKind, value: boolean): HomePrefs => ({
  ...prefs,
  alerts: { ...prefs.alerts, [kind]: value },
});
