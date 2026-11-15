import type { MessageView } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MouseEvent } from 'react';
import { threadFileQuery } from '@/features/messaging/inbox/api/api';

/** A tab opened on the click itself (so no popup blocker stops it), sent to the URL once signed. */
function openSigned(sign: () => Promise<{ url: string }>): void {
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  const go = (url: string) =>
    tab ? tab.location.assign(url) : window.open(url, '_blank', 'noopener,noreferrer');
  sign().then(({ url }) => void go(url), () => tab?.close());
}

/**
 * The PDF card's link (W6: the log signs no file before a click). A fresh signed URL in the cache
 * is the link itself; else the click opens a tab at once and signs the file, so the first click
 * always opens it, and a failed signature closes that tab and leaves the card as it was.
 */
export function useOpenPdf(m: MessageView): { href: string; onClick: (e: MouseEvent) => void } {
  const client = useQueryClient();
  const query = threadFileQuery(m.phone_e164, m.id);
  const file = useQuery({ ...query, enabled: false });
  const ready = file.data && !file.isStale ? file.data.url : null;
  const onClick = (e: MouseEvent) => {
    if (ready) return;
    e.preventDefault();
    openSigned(() => client.query(query));
  };
  return { href: ready ?? '#', onClick };
}
