import type { ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { meQuery } from '@/features/people/auth/me';
import { sendGateQuery } from '@/features/messaging/messaging/api';
import { t } from '@/lib/i18n/i18n';
import { useReadsMessaging } from '../lib/allowed-templates';
import { ComposerPhone, type ComposerMode as Mode } from './ComposerPhone';
import type { PrefillContext } from '../lib/template-params';
import { useTextOnReply } from '../lib/use-reply-target';
import { reopenNote, useThreadReopen } from '../lib/use-thread-reopen';

/**
 * Reply box (R-LEAD-02). Inside the 24 h window: a plain message, or a template. After it: the
 * fixed notice (inbox.sessionClosed) and approved templates only. While any send gate is closed a
 * note says messages wait in the queue — the admin's switch, or the server (env / WhatsApp not
 * configured), which the switch alone cannot open. A teacher gets the plain version of it.
 * Every width gets the compact chat composer (ComposerPhone, W2); the header chip counts the window down.
 * «رد» picked while the template toggle is on brings the message box back (a template quotes nothing).
 * A closed window, once opened, asks the server to reopen it (useThreadReopen) and says so above the box.
 */
export function Composer({ thread, context: known }: { thread: ThreadView; context: PrefillContext }) {
  // contact_name starts as the name the header shows (guardian ?? lead's WhatsApp name ?? teacher).
  const context = { contactName: thread.display_name, ...known };
  const gate = useQuery({ ...sendGateQuery, enabled: useReadsMessaging() });
  const asTeacher = useQuery(meQuery).data?.role === 'teacher';
  const [mode, setMode] = useState<Mode>('text');
  const reopen = reopenNote(useThreadReopen(thread));
  useTextOnReply(() => setMode('text'));
  const closed = gate.data && !gate.data.open ? gate.data.reason : null;
  const teacher = !!thread.teacher_id && !thread.guardian_id;
  const gateNote = !closed
    ? null
    : asTeacher
      ? t.inbox.messagingOffTeacher
      : closed === 'switch_off'
        ? t.inbox.messagingOff
        : t.inbox.messagingOffServer;
  return (
    <>
      {reopen && (
        <p role="status" data-testid="reopen-note" className="shrink-0 px-3 py-1 text-center text-xs text-ink-3 shell:px-0">
          {reopen}
        </p>
      )}
      <ComposerPhone thread={thread} context={context} gateNote={gateNote} mode={mode} onMode={setMode} teacher={teacher} />
    </>
  );
}
