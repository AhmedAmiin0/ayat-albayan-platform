import { safeHttpUrl } from '@ab/shared';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LinkActions } from '@/features/sales/sales/schedule/LinkActions';

const L = t.studentLists;

/** Only an http(s) URL is shown; for a platform-classroom teacher, families get that link. */
export function TeacherMeetingLink({ link, platform }: { link: string | null; platform: boolean }) {
  const url = safeHttpUrl(link);
  return (
    <section aria-label={L.meetingLink} className="grid gap-1.5">
      <h3 className="font-semibold">{L.meetingLink}</h3>
      {url ? (
        <>
          <Ltr className="block max-w-full overflow-hidden text-ellipsis text-sm">{url}</Ltr>
          <LinkActions url={url} />
        </>
      ) : (
        <p className="text-sm text-ink-3">{L.meetingLinkNone}</p>
      )}
      {platform && <p className="text-xs text-ink-3">{L.meetingLinkAuto}</p>}
    </section>
  );
}
