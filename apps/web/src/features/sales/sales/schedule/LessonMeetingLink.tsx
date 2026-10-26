import { safeHttpUrl, type SalesScheduleLesson } from '@ab/shared';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { usePlatformClassroom } from '@/lib/settings/public-config';
import { useCopy } from './use-copy';

const L = t.studentLists;

/**
 * The value of «رابط الحلقة» in sales' lesson details (owner 2026-10-26, mobile parity): «عبر الفصل» in our
 * classroom, else the full http(s) URL (LTR, wraps) with «انسخ الرابط» and «افتح الرابط», else «لا يوجد رابط».
 */
export function LessonMeetingLink({ lesson }: { lesson: SalesScheduleLesson }) {
  const platform = usePlatformClassroom(lesson.platform_classroom);
  const [copy, onCopy] = useCopy();
  if (platform) return <>{t.lessons.viaClassroom}</>;
  const url = safeHttpUrl(lesson.meeting_link ?? null);
  if (!url) return <>{t.lessons.noLink}</>;
  return (
    <span className="grid justify-items-start gap-1.5">
      <bdi dir="ltr" className="block max-w-full break-all text-left text-sm">
        {url}
      </bdi>
      <span className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => void onCopy(url)}>
          {L.copyLink}
        </Button>
        <a href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          {L.openLink}
        </a>
        {copy !== 'idle' && (
          <span role="status" className="text-xs text-ink-2">
            {copy === 'copied' ? L.copied : L.copyFailed}
          </span>
        )}
      </span>
    </span>
  );
}
