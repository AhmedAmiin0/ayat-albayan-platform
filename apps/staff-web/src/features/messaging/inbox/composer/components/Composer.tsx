import type { ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { meQuery, t } from '@ab/web-kit';
import { sendGateQuery } from '@/features/messaging/messaging/api';
import { useReadsMessaging } from '@/features/messaging/inbox/composer/lib/allowed-templates';
import { ComposerPhone, type ComposerMode as Mode } from './ComposerPhone';
import type { PrefillContext } from '@/features/messaging/inbox/composer/lib/template-params';
import { useTextOnReply } from '@/features/messaging/inbox/composer/lib/use-reply-target';

/** Reply box (R-LEAD-02): plain or template inside the 24 h window, approved templates after it. */
export function Composer({
  thread,
  context: known,
}: {
  thread: ThreadView;
  context: PrefillContext;
}) {
  // contact_name starts as the name the header shows (guardian ?? lead's WhatsApp name ?? teacher).
  const context = { contactName: thread.display_name, ...known };
  const gate = useQuery({ ...sendGateQuery, enabled: useReadsMessaging() });
  const asTeacher = useQuery(meQuery).data?.role === 'teacher';
  const [mode, setMode] = useState<Mode>('text');
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
    <ComposerPhone
      thread={thread}
      context={context}
      gateNote={gateNote}
      mode={mode}
      onMode={setMode}
      teacher={teacher}
    />
  );
}
