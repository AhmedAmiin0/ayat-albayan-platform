import { ALERT_KINDS, type AlertKind, type HomePrefs, withAlert } from './home-prefs.js';

// The «تخصيص» switches in order, shared by the web dialog and the mobile screen: each knows its
// label, its value and the prefs it makes. The apps only draw them.

export interface PrefSwitchWords {
  kind: Readonly<Record<AlertKind, string>>;
  hero: string;
  ended: string;
  compact: string;
}

export interface PrefSwitch {
  id: string;
  label: string;
  value: boolean;
  /** The prefs with this switch set to `on`. */
  next: (on: boolean) => HomePrefs;
}

export interface PrefSwitchGroups {
  alerts: PrefSwitch[];
  display: PrefSwitch[];
}

const alertSwitch = (p: HomePrefs, w: PrefSwitchWords) => (kind: AlertKind): PrefSwitch => ({
  id: kind,
  label: w.kind[kind],
  value: p.alerts[kind],
  next: (on) => withAlert(p, kind, on),
});

/** Each alert kind, then the hero, the ended lessons and compact rows. */
export function prefSwitches(p: HomePrefs, w: PrefSwitchWords): PrefSwitchGroups {
  return {
    alerts: ALERT_KINDS.map(alertSwitch(p, w)),
    display: [
      { id: 'hero', label: w.hero, value: p.hero, next: (hero) => ({ ...p, hero }) },
      { id: 'ended', label: w.ended, value: p.ended, next: (ended) => ({ ...p, ended }) },
      {
        id: 'compact',
        label: w.compact,
        value: p.density === 'compact',
        next: (on) => ({ ...p, density: on ? 'compact' : 'comfortable' }),
      },
    ],
  };
}
