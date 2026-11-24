import type { ThreadLesson, ThreadPeople } from '@ab/shared';
import { studentStatusStyle } from '@ab/money';
import { useQuery } from '@tanstack/react-query';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { fullTime } from '@/features/messaging/inbox/format';
import { salesFamilyQuery } from '@/features/sales/sales-money';
import { useClock } from '@ab/web-kit/lib/clock';

export interface SalesFamilyLineProps {
  phone: string;
  /** pages[0].people: the family's children (their subscriptions arrive nulled for sales). */
  people: ThreadPeople;
  /** pages[0].lessons: the family's next open lessons, soonest first. */
  lessons: readonly ThreadLesson[];
}

/** Sales never see a package badge here; sales gets no packages (W3). */
export function SalesFamilyLine({ phone, people, lessons }: SalesFamilyLineProps) {
  const children = people.students;
  const family = useQuery({ ...salesFamilyQuery(phone), enabled: children.length > 0 });
  const next = lessons[0];
  const clock = useClock();
  if (children.length === 0 && !next) return null;
  const notHers = children.length > 0 && family.isSuccess && family.data.students.length === 0;
  return (
    <>
      {children.map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-ink-2">{s.name}</span>
          <Ltr>{s.code}</Ltr>
          <StatusChip size="sm" {...studentStatusStyle[s.status]} label={t.enums.studentStatus[s.status]} />
          {s.teacher_name && <span>{s.teacher_name}</span>}
        </span>
      ))}
      {next && <span>{t.inbox.nextLesson.replace('{when}', fullTime(next.starts_at, clock))}</span>}
      {notHers && <span className="font-semibold text-ink-2">{t.inbox.salesNotYours}</span>}
    </>
  );
}
