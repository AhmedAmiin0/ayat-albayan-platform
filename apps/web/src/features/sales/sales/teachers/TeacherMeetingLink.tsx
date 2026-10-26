import { safeHttpUrl } from '@ab/shared';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import { useCopy } from '../schedule/use-copy';

const L = t.studentLists;

/**
 * «رابط الحلقة الثابت» in the teacher's drawer (owner 2026-10-12; since 2026-10-26 the schedule shows
 * the lesson's link too, LessonMeetingLink): the URL as an LTR island, «انسخ الرابط» and «افتح الرابط». Only an http(s) URL is shown, anything
 * else reads «لا يوجد رابط ثابت». When the teacher's lessons go out with
 * the platform classroom (SalesTeacherView.platform_classroom) a line says families get that link.
 */
export function TeacherMeetingLink({ link, platform }: { link: string | null; platform: boolean }) {
  const [copy, onCopy] = useCopy();
  const url = safeHttpUrl(link);
  return (
    <section aria-label={L.meetingLink} className="grid gap-1.5">
      <h3 className="font-semibold">{L.meetingLink}</h3>
      {url ? (
        <>
          <Ltr className="block max-w-full overflow-hidden text-ellipsis text-sm">{url}</Ltr>
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-3">{L.meetingLinkNone}</p>
      )}
      {platform && <p className="text-xs text-ink-3">{L.meetingLinkAuto}</p>}
    </section>
  );
}
