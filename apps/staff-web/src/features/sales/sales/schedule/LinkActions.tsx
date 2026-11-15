import { useState } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { ButtonRow } from '@/components/ui/layout/button-row';
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

/**
 * One ButtonRow (docs/07 «الأزرار»): «انسخ الرابط» (navigator.clipboard, with a status line) | «افتح الرابط»
 * (new tab) for a safe http(s) URL, equal width with their icons, then the status line.
 */
export function LinkActions({ url }: { url: string }) {
  const [copy, onCopy] = useCopy();
  return (
    <span className="grid gap-1.5">
      <ButtonRow>
        <Button type="button" variant="secondary" onClick={() => void onCopy(url)}>
          <Icon name="copy" />
          {L.copyLink}
        </Button>
        <a href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'secondary' })}>
          <Icon name="external" />
          {L.openLink}
        </a>
      </ButtonRow>
      {copy !== 'idle' && (
        <span role="status" className="text-xs text-ink-2">
          {copy === 'copied' ? L.copied : L.copyFailed}
        </span>
      )}
    </span>
  );
}
