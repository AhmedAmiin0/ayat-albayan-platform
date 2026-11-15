import { studentStatusStyle, type ThreadLesson, type ThreadPeople } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { fullTime } from '@/features/messaging/inbox/format';
import { salesFamilyQuery } from '@/features/sales/sales-money';
import { useClock } from '@/lib/clock';

export interface SalesFamilyLineProps {
  phone: string;
  /** pages[0].people: the family's children (their subscriptions arrive nulled for sales). */
  people: ThreadPeople;
  /** pages[0].lessons: the family's next open lessons, soonest first. */
  lessons: readonly ThreadLesson[];
}

/**
 * Which children a sales chat is about (W3), in the header's second row: each child's name, code,
 * status and teacher, then the next lesson. Never a «مشترك» badge: sales gets no packages here.
 * When none of the children are hers (GET /sales/money/family, the cached query of the header
 * actions), «يتابعه مساعد آخر أو الإدارة» explains why there are no money actions.
 */
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
