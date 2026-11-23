import { safeHttpUrl, type SalesScheduleLesson } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { usePlatformClassroom } from '@ab/web-kit/lib/settings/public-config';
import { LinkActions } from './LinkActions';

/** Our classroom, else the full http(s) URL on its own LTR line over LinkActions, else none. */
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
