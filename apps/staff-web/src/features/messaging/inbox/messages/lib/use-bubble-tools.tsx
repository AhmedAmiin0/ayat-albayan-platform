import type { MessageView } from '@ab/shared';
import { type ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toast, ApiError, t } from '@ab/web-kit';
import { errorCode } from '@/features/teaching/schedule';
import { threadFileDownload } from '@/features/messaging/inbox/api/api';
import { copyText, saveUrl } from './save-file';

interface Said {
  text: string;
  tone: 'info' | 'error';
}

export interface BubbleTools {
  copy: (m: MessageView) => void;
  /** A fresh signed URL each time, under the same rules as opening it. */
  download: (m: MessageView) => void;
  /** The toast while there is something to say (portalled: the bubble's actions fade out). */
  toast: ReactNode;
}

/** Mirrors MessageMedia: 403 forbidden, 410 gone from WhatsApp, 409 crm_no_media. */
function downloadError(e: unknown): string {
  if (e instanceof ApiError && e.status === 403) return t.inbox.mediaNotAllowed;
  if (e instanceof ApiError && e.status === 410) return t.inbox.mediaExpired;
  return errorCode(e) === 'crm_no_media' ? t.inbox.mediaInCrm : t.inbox.download.failed;
}

export function useBubbleTools(): BubbleTools {
  const [said, say] = useState<Said | null>(null);
  const done = () => say(null);
  const copy = (m: MessageView) => {
    void copyText(m.body ?? '').then((ok) =>
      say(
        ok
          ? { text: t.inbox.copy.done, tone: 'info' }
          : { text: t.inbox.copy.failed, tone: 'error' },
      ),
    );
  };
  const download = (m: MessageView) => {
    threadFileDownload(m.phone_e164, m.id).then(
      (file) => saveUrl(file.url),
      (e: unknown) => say({ text: downloadError(e), tone: 'error' }),
    );
  };
  const toast = said
    ? createPortal(
        <Toast
          message={said.text}
          tone={said.tone}
          duration={said.tone === 'info' ? 2000 : 5000}
          onDismiss={done}
        />,
        document.body,
      )
    : null;
  return { copy, download, toast };
}
