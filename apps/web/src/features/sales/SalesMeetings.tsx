import { isOpenLesson } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { dayAround } from '@/features/classroom/api';
import { t } from '@/lib/i18n';
import { salesMeetingsQuery } from './api';
import { MeetingRow } from './MeetingRow';

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

/** /sales/meetings «مواعيدي»: my meetings of one day, each with «ادخل الحلقة» (15 min before to 2 h after). */
export function SalesMeetings() {
  const [offset, setOffset] = useState(0);
  const day = dayAround(new Date(), offset);
  const meetings = useQuery(salesMeetingsQuery(day));
  const rows = (meetings.data ?? []).filter((m) => isOpenLesson(m.status));
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
      {meetings.isSuccess && rows.length === 0 && <EmptyState title={t.sales.schedule.empty} />}
      <ul aria-label={t.sales.schedule.list}>
        {rows.map((m) => (
          <MeetingRow key={m.lesson_id} meeting={m} />
        ))}
      </ul>
    </section>
  );
}
