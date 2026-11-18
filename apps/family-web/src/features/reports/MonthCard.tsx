import { dateText, type PortalReport, type PortalStudent } from '@ab/shared';
import { FamilyCard } from '@ab/web-kit/family/layout/FamilyCard';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { ReportRow } from './ReportRow';

const MONTH = { month: 'long', year: 'numeric' } as const;

/** «نوفمبر 2026» of a «YYYY-MM» month. */
export const monthTitle = (month: string) =>
  dateText(new Date(`${month}-15T12:00:00Z`), { tz: 'UTC', locale }, MONTH);

interface Props {
  month: string;
  rows: PortalReport[];
  student: PortalStudent;
}

/** One month of reports (boards: the green-edged card): its title, the count, newest first. */
export function MonthCard({ month, rows, student }: Props) {
  const id = `reports-${month}`;
  const count = t.familyLook.pages.reports.count.replace('{n}', String(rows.length));
  return (
    <FamilyCard as="section" tone="green" labelledBy={id} className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} className="text-[20px] font-extrabold text-ink sm:text-[22px]">
          {monthTitle(month)}
        </h2>
        <span className="text-sm font-semibold text-ink-3">{count}</span>
      </div>
      <ul className="grid gap-2.5">
        {rows.map((report) => (
          <ReportRow key={report.id} report={report} student={student} />
        ))}
      </ul>
    </FamilyCard>
  );
}
