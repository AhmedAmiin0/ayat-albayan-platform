import type { MeetingInviteResult } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n';
import { copyText } from './internal-api';
import { copyPayload, inviteStatusText, notSentHint } from './invite-status';

const R = t.meetingInvites.results;

/** One recipient: the name, how it went and, when a personal link came back, «انسخ الرابط والدعوة». */
export function InviteResultRow({ result }: { result: MeetingInviteResult }) {
  const [copied, setCopied] = useState(false);
  const payload = copyPayload(result);
  const closed = result.status === 'window_closed';
  const hint = notSentHint(result);
  return (
    <li className="grid gap-1.5 border-b border-rule py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span dir={result.kind === 'phone' ? 'ltr' : undefined} className="font-semibold">{result.display_name}</span>
        <span className={closed ? 'text-xs text-act' : 'text-xs text-ink-2'}>{inviteStatusText(result)}</span>
      </div>
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
      {payload !== null && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void copyText(payload).then(setCopied)}>
            {R.copy}
          </Button>
          {copied && <span role="status" className="text-xs text-ink-2">{R.copied}</span>}
        </div>
      )}
    </li>
  );
}
