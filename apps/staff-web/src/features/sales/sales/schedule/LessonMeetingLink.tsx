import { safeHttpUrl, type SalesScheduleLesson } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { usePlatformClassroom } from '@/lib/settings/public-config';
import { LinkActions } from './LinkActions';

/**
 * The value of «رابط الحلقة» in sales' lesson details (owner 2026-10-26, mobile parity): «عبر الفصل»
 * in our classroom, else the full http(s) URL on its own line (LTR, one line, cut at the end, still
 * selectable) over the LinkActions row, else «لا يوجد رابط».
 */
export function LessonMeetingLink({ lesson }: { lesson: SalesScheduleLesson }) {
  const platform = usePlatformClassroom(lesson.platform_classroom);
  if (platform) return <>{t.lessons.viaClassroom}</>;
  const url = safeHttpUrl(lesson.meeting_link ?? null);
  if (!url) return <>{t.lessons.noLink}</>;
  return (
    <span className="grid gap-1.5">
      <bdi dir="ltr" title={url} className="block max-w-full truncate text-left text-sm">
        {url}
      </bdi>
      <LinkActions url={url} />
    </span>
  );
}
