import { localizedName } from '@ab/shared';
import { conflictLine } from '@/booking/shared/booking-errors';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { usePlatformClassroom } from '@/core/lib/query/public-config';
import { type, useTheme } from '@/theme';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { DetailsFact, DetailsGroup, DetailsLine } from './DetailsGroup';
import type { DetailsLesson, DetailsRole } from './details-text';

/** «رابط الحلقة»: «عبر الفصل» in our classroom, else the copied link (selectable), else «لا يوجد رابط». */
function JoinLinkFact({ link, platform }: { link: string | null; platform: boolean }) {
  const { color } = useTheme();
  return (
    <DetailsFact label={t.lessons.joinLink}>
      {platform ? (
        <DetailsLine>{t.lessons.viaClassroom}</DetailsLine>
      ) : link ? (
        <Ltr
          selectable
          numberOfLines={1}
          style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}
        >
          {link.replace(/^https?:\/\//, '')}
        </Ltr>
      ) : (
        <DetailsLine>{t.lessons.noLink}</DetailsLine>
      )}
    </DetailsFact>
  );
}

/**
 * «بيانات الحلقة»: the teacher, the way in (the copied link, or «عبر الفصل» when the lesson's
 * teacher holds it in our classroom; sales never sees a link), the override and cancel reasons and
 * the clashes the daily job found (R-SCH-04), in the bad tone.
 */
export function DetailsAbout({ lesson, role }: { lesson: DetailsLesson; role: DetailsRole }) {
  const platform = usePlatformClassroom(lesson.platform_classroom);
  const teacher = localizedName(
    { ar: lesson.teacher.display_name_ar, en: lesson.teacher.display_name_en ?? null },
    locale,
  );
  // The override reason and the generated clashes are the admin's (no teacher screen shows them).
  const admin = role === 'admin';
  const conflicts = admin ? (lesson.conflicts ?? []) : [];
  return (
    <DetailsGroup label={t.lessons.sheet.about}>
      <DetailsFact label={t.schedule.teacher}>{teacher}</DetailsFact>
      {role === 'sales' ? null : <JoinLinkFact link={lesson.meeting_link ?? null} platform={platform} />}
      {admin && lesson.override_reason ? (
        <DetailsFact label={t.booking.overrideReason}>{lesson.override_reason}</DetailsFact>
      ) : null}
      {lesson.cancel_reason ? (
        <DetailsFact label={t.lessons.reason}>{lesson.cancel_reason}</DetailsFact>
      ) : null}
      {conflicts.length > 0 ? (
        <DetailsFact label={t.schedule.needsReview}>
          <DetailsLine tone="bad">{t.schedule.generatedConflict}</DetailsLine>
          {conflicts.map((c, i) => (
            <DetailsLine key={`${c.kind}-${i}`}>{conflictLine(c)}</DetailsLine>
          ))}
        </DetailsFact>
      ) : null}
    </DetailsGroup>
  );
}
