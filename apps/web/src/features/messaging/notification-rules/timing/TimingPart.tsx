import { VALUE_GROUP_IDS, VALUE_GROUPS, type NotificationEntryView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { fillText, timingText } from '@/features/messaging/notification-rules/rule-text';
import type { RuleRowState } from '@/features/messaging/notification-rules/table/use-rule-row';
import { TimingEditor } from './TimingEditor';

const tm = t.notificationRules.timing;

/** The «القيم» group that holds renewal_alert_remaining (the renewal row shows it by reference). */
export const RENEWAL_GROUP = VALUE_GROUP_IDS.find((g) => (VALUE_GROUPS[g] as readonly string[]).includes('renewal_alert_remaining'));

/** Today's v1 timing in words (rows without a timing of their own: staff pushes). */
function legacyText(entry: NotificationEntryView): string | null {
  if (!entry.timing) return null;
  return t.notificationCatalogue.timing[entry.timing.key].replace('{value}', entry.timing.value);
}

/**
 * The «متى» part of a row's name cell: the editor (with notifications.manage on an editable row),
 * else the timing in words; renewal_due by reference to «القيم», the join link «مع تذكير الحلقة».
 */
export function TimingPart({ entry, row }: { entry: NotificationEntryView; row: RuleRowState | null }) {
  const clock = useClock();
  if (entry.key === 'renewal_due') {
    return (
      <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-2">
        <span>{fillText(tm.renewalRef, { n: entry.timing?.value ?? '' })}</span>
        {row && (
          <Link
            to="/admin/settings/values"
            search={RENEWAL_GROUP ? { group: RENEWAL_GROUP } : {}}
            className="inline-flex min-h-11 items-center font-semibold text-lapis underline underline-offset-4 sm:min-h-0"
          >
            {tm.renewalLink}
          </Link>
        )}
      </span>
    );
  }
  if (entry.key === 'lesson_join_link') return <span className="text-xs text-ink-2">{tm.withReminder}</span>;
  if (row?.draft.timing) {
    const error = row.result.ok ? null : row.result.error;
    return <TimingEditor draft={row.draft.timing} onChange={(timing) => row.set({ timing })} disabled={row.saving} error={error} />;
  }
  const text = entry.rule ? timingText(entry.key, entry.rule.timing, clock) : null;
  const shown = text ?? legacyText(entry);
  return shown ? <span className="text-xs text-ink-2">{shown}</span> : null;
}
