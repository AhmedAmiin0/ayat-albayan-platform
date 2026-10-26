import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';

const L = t.studentLists;

type CopyState = 'idle' | 'copied' | 'failed';

/** «انسخ الرابط» on the sales pages: navigator.clipboard, and whether it worked. */
function useCopy(): [CopyState, (text: string) => Promise<void>] {
  const [state, setState] = useState<CopyState>('idle');
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      // Clipboard blocked (http, old browser): the URL stays on screen to copy by hand.
      setState('failed');
    }
  };
  return [state, copy];
}

/** «انسخ الرابط» (navigator.clipboard, with a status line) and «افتح الرابط» (new tab) for a safe http(s) URL. */
export function LinkActions({ url }: { url: string }) {
  const [copy, onCopy] = useCopy();
  return (
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
  );
}
