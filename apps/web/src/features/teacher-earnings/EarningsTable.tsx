import { useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import { t } from '@/lib/i18n';
import type { TeacherEarningView } from './api';
import { earningColumns, type Selection } from './earning-columns';

type Props = { sessions: TeacherEarningView[]; selection?: Selection; emptyText: string };

/** «الحلقات»: the per-session ledger, newest first; stacked on phones. Ticks only with `selection`. */
export function EarningsTable({ sessions, selection, emptyText }: Props) {
  const columns = useMemo(() => earningColumns(selection), [selection]);
  return (
    <section aria-label={t.teacherEarnings.sessionsTitle} className="mb-8">
      <h2 className="mb-2 font-display text-lg text-ink">{t.teacherEarnings.sessionsTitle}</h2>
      <DataTable stacked columns={columns} data={sessions} getRowId={(r) => r.id} emptyText={emptyText} />
    </section>
  );
}
