import { isOpenLesson } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { dayAround } from '@/features/classroom/api';
import { t } from '@/lib/i18n';
import { salesMeetingsQuery } from './api';
import { salesMeetingColumns, teacherOptionsOf } from './sales-meeting-columns';

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * /sales/meetings «مواعيدي»: my meetings of one day, each with «ادخل الحلقة» (15 min before to 2 h
 * after). The day is loaded whole: time, who and teacher sort, who and teacher filter, locally.
 */
export function SalesMeetings() {
  const [offset, setOffset] = useState(0);
  const day = dayAround(new Date(), offset);
  const meetings = useQuery(salesMeetingsQuery(day));
  const rows = useMemo(() => (meetings.data ?? []).filter((m) => isOpenLesson(m.status)), [meetings.data]);
  const columns = useMemo(() => salesMeetingColumns(teacherOptionsOf(rows)), [rows]);
  return (
    <section aria-label={t.sales.schedule.title}>
      <PageHead>
        <Cartouche>{t.sales.schedule.title}</Cartouche>
      </PageHead>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => setOffset(offset - 1)}>{t.schedule.prevDay}</Button>
        <Button type="button" variant="secondary" onClick={() => setOffset(0)} disabled={offset === 0}>{t.schedule.today}</Button>
        <Button type="button" variant="secondary" onClick={() => setOffset(offset + 1)}>{t.schedule.nextDay}</Button>
        <h2 className="font-display text-h3 font-bold">{DAY.format(new Date(day.from))}</h2>
      </div>
      {meetings.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {meetings.isError && (
        <FormAlert>
          {t.sales.loadFailed}{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void meetings.refetch()}>
            {t.sales.retry}
          </Button>
        </FormAlert>
      )}
      {meetings.isSuccess && (
        <DataTable
          stacked
          clientSort
          clientFilter
          columns={columns}
          data={rows}
          getRowId={(m) => m.lesson_id}
          emptyText={t.sales.schedule.empty}
        />
      )}
    </section>
  );
}
