import type { ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { usePhone } from '@/components/ui/use-narrow';
import { meQuery } from '@/features/auth/me';
import { sendGateQuery } from '@/features/messaging/api';
import { t } from '@/lib/i18n';
import { ComposerPhone, type ComposerMode as Mode } from './ComposerPhone';
import { sessionUntil } from './format';
import { ReplyFromNote } from './ReplyFromNote';
import { SendRatingButton } from './SendRatingButton';
import { TemplateComposer } from './TemplateComposer';
import { TextComposer } from './TextComposer';
import type { PrefillContext } from './template-params';

const hamish = 'border-s border-s-rule ps-3 text-xs text-ink-2';

/**
 * Reply box (R-LEAD-02). Inside the 24 h window: a plain message, or a template. After it: the
 * fixed notice (inbox.sessionClosed) and approved templates only. While any send gate is closed a
 * note says messages wait in the queue — the admin's switch, or the server (env / WhatsApp not
 * configured), which the switch alone cannot open. A teacher gets the plain version of it.
 * Phones (< 640px): the compact chat composer (ComposerPhone).
 */
export function Composer({ thread, context }: { thread: ThreadView; context: PrefillContext }) {
  const gate = useQuery(sendGateQuery);
  const asTeacher = useQuery(meQuery).data?.role === 'teacher';
  const phone = usePhone();
  const [mode, setMode] = useState<Mode>('text');
  const open = thread.session_open;
  const closed = gate.data && !gate.data.open ? gate.data.reason : null;
  const teacher = !!thread.teacher_id && !thread.guardian_id;
  const gateNote = !closed
    ? null
    : asTeacher
      ? t.inbox.messagingOffTeacher
      : closed === 'switch_off'
        ? t.inbox.messagingOff
        : t.inbox.messagingOffServer;
  if (phone) {
    return <ComposerPhone thread={thread} context={context} gateNote={gateNote} mode={mode} onMode={setMode} teacher={teacher} />;
  }

  return (
    <div className="mt-4 grid shrink-0 gap-3 border-t border-rule pt-4">
      {gateNote && <p className={hamish}>{gateNote}</p>}
      {open ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {thread.last_inbound_at && <p className="text-xs text-ink-3">{sessionUntil(thread.last_inbound_at)}</p>}
          {mode === 'text' && <ReplyFromNote thread={thread} />}
          <SegmentedControl<Mode>
            label={t.inbox.composer.sendTemplate}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'text', label: t.inbox.composer.modeText },
              { value: 'template', label: t.inbox.composer.modeTemplate },
            ]}
          />
        </div>
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <NuqtaGlyph shape="hollow" className="text-ink-3" />
            <span>{t.inbox.sessionClosed}</span>
          </p>
          <SendRatingButton thread={thread} />
        </>
      )}
      {open && mode === 'text' ? (
        <TextComposer phone={thread.phone_e164} />
      ) : (
        <TemplateComposer phone={thread.phone_e164} context={context} teacher={teacher} />
      )}
    </div>
  );
}
