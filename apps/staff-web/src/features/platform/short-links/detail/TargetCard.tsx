import { sendCounts } from '@ab/client-core';
import { SHORT_LINK_SEND_STATUSES, type ShortLinkDetail } from '@ab/shared';
import { Ltr, t } from '@ab/web-kit';
import { CopyButton } from '@/features/platform/short-links/shared/CopyButton';
import { SendChip } from '@/features/platform/short-links/shared/LinkChips';

const D = t.shortLinks.detail;

/** One chip per send state that has users. */
function SendSummary({ link }: { link: ShortLinkDetail }) {
  const counts = sendCounts(link.userList);
  const shown = SHORT_LINK_SEND_STATUSES.filter((s) => counts[s] > 0);
  return (
    <div className="grid gap-2">
      <span className="text-xs text-ink-3">{D.whatsapp}</span>
      <div className="flex flex-wrap gap-2">
        {shown.map((s) => (
          <SendChip key={s} status={s} count={counts[s]} />
        ))}
      </div>
      <p className="text-xs text-ink-3">{D.whatsappHint}</p>
    </div>
  );
}

export function TargetCard({ link }: { link: ShortLinkDetail }) {
  return (
    <section className="grid content-start gap-4 rounded-md border border-rule p-4">
      <div className="grid gap-1.5">
        <span className="text-xs text-ink-3">{D.target}</span>
        <span className="flex min-w-0 items-center gap-1">
          <Ltr className="truncate text-sm">{link.targetUrl}</Ltr>
          <CopyButton text={link.targetUrl} label={`${D.copy} ${D.target}`} />
        </span>
      </div>
      {link.userList.length > 0 && <SendSummary link={link} />}
    </section>
  );
}
