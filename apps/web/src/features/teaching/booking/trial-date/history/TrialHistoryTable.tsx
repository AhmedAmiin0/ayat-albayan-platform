import type { TrialHistory } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { ScrollX } from '@/components/ui/layout/scroll-x';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { rowTexts } from './history-text';
import { trialOutcomeStyle } from './outcome-style';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

/** Rows shown before «عرض كل المواعيد»: the history stays a compact block. */
export const TRIAL_ROWS_SHOWN = 5;

const head = 'border-b border-rule-strong px-2 py-1.5 text-start text-xs font-semibold text-ink-3';
const cell = 'border-b border-rule px-2 py-2 text-start align-top text-xs text-ink-2';
const c = t.trialDate.columns;

export interface TrialHistoryTableProps {
  history: TrialHistory;
  /** The viewer's zone; useViewerTz() by default. */
  viewerTz?: string | undefined;
}

/** «مواعيد الحلقة التجريبية» (R-STU-05, R-SCH-07): newest pick first, the first 5 then «عرض كل المواعيد». */
export function TrialHistoryTable({ history, viewerTz: pinned }: TrialHistoryTableProps) {
  const own = useViewerTz();
  const viewerTz = pinned ?? own;
  const clock = useClock();
  const [all, setAll] = useState(false);
  const rows = all ? history.items : history.items.slice(0, TRIAL_ROWS_SHOWN);
  const more = history.items.length > TRIAL_ROWS_SHOWN;
  return (
    <div className="grid gap-2">
      <ScrollX label={t.trialDate.historyTitle}>
        <table data-testid="trial-date-history" className="w-full min-w-[480px] border-collapse">
          <caption className="sr-only">{t.trialDate.historyTitle}</caption>
          <thead>
            <tr>
              {[c.when, c.teacher, c.outcome, c.pickedBy].map((label) => (
                <th key={label} scope="col" className={head}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const text = rowTexts({ row, familyTz: history.family_tz, viewerTz }, clock);
              return (
                <tr key={row.lesson_id} data-outcome={row.outcome}>
                  <th scope="row" className={`${cell} font-semibold text-ink tabular-nums`}>
                    <span className="block">{text.when}</span>
                    {text.family && <span className="block font-normal text-ink-3">{text.family}</span>}
                  </th>
                  <td className={cell}>{row.teacher?.name ?? '—'}</td>
                  <td className={cell}>
                    <StatusChip size="sm" {...trialOutcomeStyle[row.outcome]} label={t.trialDate.outcome[row.outcome]} />
                  </td>
                  <td className={cell}>{text.picked}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollX>
      {more && (
        <Button type="button" variant="ghost" size="sm" className="justify-self-start" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? t.trialDate.web.showFewer : t.trialDate.web.showAll.replace('{n}', String(history.items.length))}
        </Button>
      )}
    </div>
  );
}
