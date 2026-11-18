import { lessonWhenAt, type ReportPageView } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { pill } from '@ab/web-kit/family/brand/pill';
import { Hero, HeroTitle } from '@ab/web-kit/family/layout/Hero';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { OverallArch } from './OverallArch';
import type { ReportCards } from './report-cards';

export const REPORT_TITLE_ID = 'report-title';

const CHIP = 'inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/25 ' +
  'bg-white/10 px-3 text-xs font-bold text-fam-hero-ink';

/** Whose lesson and when, the teacher and the attendance, on the band (data in hand). */
function Meta({ view, cards }: { view: ReportPageView; cards: ReportCards }) {
  const clock = useClock();
  const when = lessonWhenAt(new Date(view.lesson.starts_at), { tz: view.tz, ...clock });
  const line = t.familyLook.pages.report.line
    .replace('{student}', view.student.name)
    .replace('{date}', when);
  return (
    <>
      <p className="text-sm text-fam-hero-ink-2 sm:text-body">{line}</p>
      <ul className="flex flex-wrap gap-2">
        <li className={CHIP}>{t.reportPage.teacher.replace('{name}', view.teacher.name)}</li>
        {cards.attendance?.value && (
          <li className={CHIP}>
            <span aria-hidden="true" className="size-2 rounded-full bg-[#34d399]" />
            {cards.attendance.value}
          </li>
        )}
      </ul>
    </>
  );
}

interface Props {
  page: { view: ReportPageView; cards: ReportCards } | null;
  onBack: () => void;
}

/**
 * The report's band (boards: PortalWebReport): «العودة» as a pill, «تقرير الحلقة», whose lesson
 * and when, the teacher and attendance chips, and the overall grade's gold arch.
 */
export function ReportHero({ page, onBack }: Props) {
  const overall = page?.cards.overall;
  return (
    <Hero labelledBy={REPORT_TITLE_ID}>
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="grid justify-items-start gap-3">
          <button type="button" className={pill({ tone: 'onDark' })} onClick={onBack}>
            <Icon name="chevron-right" />
            {t.portal.backToLessons}
          </button>
          <HeroTitle id={REPORT_TITLE_ID} title={t.portal.reportTitle} />
          {page && <Meta view={page.view} cards={page.cards} />}
        </div>
        {overall?.value && <OverallArch label={overall.label} value={overall.value} />}
      </div>
    </Hero>
  );
}
