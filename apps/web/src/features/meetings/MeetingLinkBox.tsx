import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { copyText } from './internal-api';

const L = t.meetings.internal;

/** The meeting's link, selectable, with «انسخ الرابط» (the clipboard may be blocked: the URL stays to copy by hand). */
export function MeetingLinkBox({ url, note }: { url: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="grid gap-2">
      {note && <p className="text-sm text-ink-2">{note}</p>}
      <input
        readOnly
        dir="ltr"
        value={url}
        aria-label={L.link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-md border border-rule bg-raised px-2 py-1.5 text-xs"
      />
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => void copyText(url).then(setCopied)}>
          {L.copy}
        </Button>
        {copied && <span className="text-xs text-ink-2">{L.copied}</span>}
      </div>
    </div>
  );
}
