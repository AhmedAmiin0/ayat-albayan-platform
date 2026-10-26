import { safeHttpUrl, type SalesScheduleLesson } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { usePlatformClassroom } from '@/lib/settings/public-config';
import { LinkActions } from './LinkActions';

/**
 * The value of «رابط الحلقة» in sales' lesson details (owner 2026-10-26, mobile parity): «عبر الفصل»
 * in our classroom, else the full http(s) URL (LTR, wraps) with LinkActions, else «لا يوجد رابط».
 */
export function LessonMeetingLink({ lesson }: { lesson: SalesScheduleLesson }) {
  const platform = usePlatformClassroom(lesson.platform_classroom);
  if (platform) return <>{t.lessons.viaClassroom}</>;
  const url = safeHttpUrl(lesson.meeting_link ?? null);
  if (!url) return <>{t.lessons.noLink}</>;
  return (
    <span className="grid justify-items-start gap-1.5">
      <bdi dir="ltr" className="block max-w-full break-all text-left text-sm">
        {url}
      </bdi>
      <LinkActions url={url} />
    </span>
  );
}
