import { ALERT_KINDS, type HomePrefs, withAlert } from '@ab/client-core';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { saveHomePrefs, useHomePrefs } from './home-prefs';
import { PrefSwitch } from './PrefSwitch';

type Flag = 'ended' | 'hero';
const FLAGS: readonly { key: Flag; label: string }[] = [
  { key: 'hero', label: t.teacherAlerts.hero },
  { key: 'ended', label: t.teacherAlerts.ended },
];

const save = (prefs: HomePrefs) => (patch: Partial<HomePrefs>) =>
  saveHomePrefs({ ...prefs, ...patch });

/**
 * «تخصيص» (owner 2026-11-14): each alert kind, the hero, the ended lessons and compact rows.
 * Every switch applies at once and is saved in this browser only.
 */
export function HomeCustomize({ onClose }: { onClose: () => void }) {
  const prefs = useHomePrefs();
  const patch = save(prefs);
  return (
    <Dialog
      title={t.teacherAlerts.customizeTitle}
      onClose={onClose}
      layout="sheet"
      hint={t.teacherAlerts.savedHere}
      actions={<Button type="button" onClick={onClose}>{t.teacherAlerts.done}</Button>}
    >
      <fieldset className="grid">
        <legend className="mb-1 text-xs font-semibold text-ink-3">{t.teacherAlerts.alertsGroup}</legend>
        {ALERT_KINDS.map((kind) => (
          <PrefSwitch
            key={kind}
            label={t.teacherAlerts.kind[kind]}
            checked={prefs.alerts[kind]}
            onChange={(on) => saveHomePrefs(withAlert(prefs, kind, on))}
          />
        ))}
      </fieldset>
      <fieldset className="mt-4 grid">
        <legend className="mb-1 text-xs font-semibold text-ink-3">{t.teacherAlerts.displayGroup}</legend>
        {FLAGS.map((f) => (
          <PrefSwitch
            key={f.key}
            label={f.label}
            checked={prefs[f.key]}
            onChange={(on) => patch({ [f.key]: on })}
          />
        ))}
        <PrefSwitch
          label={t.teacherAlerts.compact}
          checked={prefs.density === 'compact'}
          onChange={(on) => patch({ density: on ? 'compact' : 'comfortable' })}
        />
      </fieldset>
    </Dialog>
  );
}
