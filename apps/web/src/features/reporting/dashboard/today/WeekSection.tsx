import { ScrollX } from '@/components/ui/layout/scroll-x';
import { dayMonthLabel } from '@/features/teaching/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import { sectionTitle } from '../shared/Bar';
import { LessonsByStatus } from './LessonsByStatus';
import { TeacherLoad } from './TeacherLoad';
import type { DashboardData, DayRange } from '../types';

/** «الأسبوع ده» (Saturday → Friday, Riyadh): lessons by status and teacher load (R-RPT-01). */
export function WeekSection({ week, data }: { week: DayRange; data: DashboardData | undefined }) {
  const span = t.dashboard.weekOf.replace('{from}', dayMonthLabel(week.from)).replace('{to}', dayMonthLabel(week.to));
  return (
    <section aria-labelledby="dash-week" className="grid grid-cols-1 gap-4">
      <header className="flex flex-wrap items-baseline gap-x-3">
        <h2 id="dash-week" className={sectionTitle}>
          {t.dashboard.thisWeek}
        </h2>
        <span className="text-xs text-ink-3">{span}</span>
      </header>
      {data ? (
        <div className="grid grid-cols-1 gap-6 @3xl:grid-cols-2">
          <div className="grid grid-cols-1 content-start gap-2">
            <h3 className="text-sm font-semibold text-ink-2">{t.dashboard.lessonsByStatus}</h3>
            <LessonsByStatus counts={data.lessons_by_status} />
          </div>
          <div className="grid grid-cols-1 content-start gap-2">
            <h3 className="text-sm font-semibold text-ink-2">{t.dashboard.teacherLoad}</h3>
            <ScrollX label={t.dashboard.teacherLoad}>
              <TeacherLoad rows={data.teacher_load} />
            </ScrollX>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-3">{t.common.loading}</p>
      )}
    </section>
  );
}
