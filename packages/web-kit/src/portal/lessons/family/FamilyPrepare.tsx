import { prepareCard } from '@ab/client-core';
import { dateText, type PortalLessons, type PortalStudent } from '@ab/shared';
import { useId } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { IconTile } from '@ab/web-kit/components/family/layout/IconTile';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import type { UpcomingLook } from './upcoming-look';

interface Props {
  lessons: Pick<PortalLessons, 'prepare'>;
  student: PortalStudent;
  look: UpcomingLook;
}

const DAY = { weekday: 'long', day: 'numeric', month: 'long' } as const;

/**
 * «ما المطلوب للحلقة القادمة» in the family look (boards PortalWebHome): the gold edge and tile,
 * the homework and next plan (an empty one left out, no card without both, as PrepareCard), and
 * «من تقرير حلقة …» opening that report. A student's own page: «استعد لحلقتك».
 */
export function FamilyPrepare({ lessons, student, look }: Props) {
  const id = useId();
  const card = prepareCard(lessons);
  if (!card) return null;
  const from = lessons.prepare?.lesson_starts_at;
  const lines: [string, string | null][] = [
    [t.portal.homework, card.homework],
    [t.portal.nextPlan, card.nextPlan],
  ];
  const title = look.own ? t.portal.app.lesson.prepareSelf : t.portal.prepareTitle;
  return (
    <section aria-labelledby={id} className="grid gap-2.5 rounded-[18px] border border-rule
      border-s-4 border-s-gold bg-sunk px-5 pt-[18px] pb-2">
      <div className="flex items-center gap-3">
        <IconTile icon="template" tone="gold" />
        <h2 id={id} className="text-[17px] font-extrabold text-ink">{title}</h2>
      </div>
      <dl className="grid gap-2">
        {lines.filter(([, text]) => text).map(([label, text]) => (
          <div key={label} className="grid gap-0.5">
            <dt className="text-[13px] font-bold text-ink-3">{label}</dt>
            <dd className="whitespace-pre-line text-[15px] font-semibold leading-relaxed">{text}</dd>
          </div>
        ))}
      </dl>
      {from && (
        <button type="button" onClick={() => look.openReport(card.reportId)}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 justify-self-start
            text-sm font-bold text-lapis hover:underline">
          {t.portal.app.lesson.fromReport.replace(
            '{date}', dateText(new Date(from), { tz: student.tz, locale }, DAY))}
          <Icon name="chevron-left" />
        </button>
      )}
    </section>
  );
}
