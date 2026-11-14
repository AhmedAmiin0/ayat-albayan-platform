import { type PrefSwitch, prefSwitches } from '@ab/client-core';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { saveHomePrefs, useHomePrefs } from './home-prefs';
import { PrefSwitch as Switch } from './PrefSwitch';

function Group({ legend, rows }: { legend: string; rows: readonly PrefSwitch[] }) {
  return (
    <fieldset className="grid [&+&]:mt-4">
      <legend className="mb-1 text-xs font-semibold text-ink-3">{legend}</legend>
      {rows.map((row) => (
        <Switch
          key={row.id}
          label={row.label}
          checked={row.value}
          onChange={(on) => saveHomePrefs(row.next(on))}
        />
      ))}
    </fieldset>
  );
}

/**
 * «تخصيص» (owner 2026-11-14): each alert kind, the hero, the ended lessons and compact rows.
 * Every switch applies at once and is saved in this browser only.
 */
export function HomeCustomize({ onClose }: { onClose: () => void }) {
  const groups = prefSwitches(useHomePrefs(), t.teacherAlerts);
  return (
    <Dialog
      title={t.teacherAlerts.customizeTitle}
      onClose={onClose}
      layout="sheet"
      hint={t.teacherAlerts.savedHere}
      actions={<Button type="button" onClick={onClose}>{t.teacherAlerts.done}</Button>}
    >
      <Group legend={t.teacherAlerts.alertsGroup} rows={groups.alerts} />
      <Group legend={t.teacherAlerts.displayGroup} rows={groups.display} />
    </Dialog>
  );
}
