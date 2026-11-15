import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { AlertRow } from './AlertRow';
import { HomeCustomize } from './HomeCustomize';
import { useHomePrefs } from './home-prefs';
import { useTodayAlerts } from './use-today-alerts';

export interface TodayAlertsProps {
  lessons: readonly LessonView[];
  now: Date;
  /** Her zone: «اليوم» is her calendar day. */
  tz: string;
  onOpen: (lessonId: string) => void;
}

/**
 * «تنبيهات اليوم» on the teacher's «اليوم» (owner 2026-11-14): her actionable items for today,
 * one row and one action each, with «تخصيص» to pick what shows. «لا تنبيهات اليوم» when none.
 */
export function TodayAlerts({ lessons, now, tz, onOpen }: TodayAlertsProps) {
  const rows = useTodayAlerts({ lessons, now, tz });
  const compact = useHomePrefs().density === 'compact';
  const [editing, setEditing] = useState(false);
  return (
    <section aria-labelledby="teacher-alerts" className="mb-4 rounded-lg border border-rule bg-raised px-3 py-2">
      <div className="flex items-center gap-2">
        <h2 id="teacher-alerts" className="font-display text-h4 font-bold">{t.teacherAlerts.title}</h2>
        <Button type="button" variant="ghost" size="sm" className="ms-auto" onClick={() => setEditing(true)}>
          <Icon name="sliders" />
          {t.teacherAlerts.customize}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-ink-2">{t.teacherAlerts.empty}</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <AlertRow key={row.key} {...{ row, compact, onOpen }} />
          ))}
        </ul>
      )}
      {editing && <HomeCustomize onClose={() => setEditing(false)} />}
    </section>
  );
}
