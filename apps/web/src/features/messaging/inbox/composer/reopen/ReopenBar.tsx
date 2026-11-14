import { carriesText, windowBar, type WindowBar } from '@ab/client-core';
import type { ReopenSent, ThreadView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import {
  noneAllowedText,
  type NoneReason,
} from '@/features/messaging/inbox/composer/lib/allowed-templates';
import type { PrefillContext } from '@/features/messaging/inbox/composer/lib/template-params';
import { useCarryText } from '@/features/messaging/inbox/composer/free-text';
import { ReopenDialog } from './ReopenDialog';
import { useCanReopen } from './use-can-reopen';
import { useReopenTick } from './use-reopen-tick';

export interface ReopenBarProps {
  thread: ThreadView;
  context: PrefillContext;
  noneAllowed: NoneReason | null;
  /** Staff on a Kapso chat line: they may still type (held until the reply). */
  trying: boolean;
  teacher: boolean;
}

const help = t.inbox.composer.noAllowedHelp;
const bar = 'grid gap-1.5 rounded-md bg-gold-wash px-3 py-2 text-xs text-ink';

/** «أُرسِل القالب»: the line, the template's tick, and (when they may type) that it is held. */
function SentBar({ phone, sent, trying }: { phone: string; sent: ReopenSent; trying: boolean }) {
  const status = t.enums.messageStatus[useReopenTick(phone, sent)];
  return (
    <div role="status" className={bar}>
      <p className="font-semibold">{t.inbox.reopenBar.sent}</p>
      <p className="text-ink-2">{t.inbox.reopenBar.status.replace('{status}', status)}</p>
      {trying && <p className="text-ink-2">{t.inbox.reopenBar.held}</p>}
    </div>
  );
}

/**
 * The closed window's bar (owner 2026-11-14, «like Kapso»), over the composer or in its place:
 * the reopen button that opens the template picker; once a reopen template is live, its tick
 * until the family replies; with no template allowed, what they can do instead (no button).
 */
export function ReopenBar(props: ReopenBarProps) {
  const { thread, noneAllowed } = props;
  const [picking, setPicking] = useState<'reopen' | 'carry' | null>(null);
  const canReopen = useCanReopen(props.teacher);
  const carry = useCarryText(thread.phone_e164, props.teacher);
  const sent = thread.reopen_sent ?? null;
  const open = thread.session_open;
  const state = windowBar({ open, sent: sent !== null, noneAllowed: !!noneAllowed });
  // «أرسِل الآن داخل قالب» (owner 2026-11-14): the draft goes now inside academy_message.
  const carrying = carriesText({ ...carry, bar: state });
  const views: Record<WindowBar, () => ReactNode> = {
    open: () => null,
    sent: () => sent && <SentBar phone={thread.phone_e164} sent={sent} trying={props.trying} />,
    none_allowed: () =>
      noneAllowed && <p className={bar}>{noneAllowedText(noneAllowed, help)}</p>,
    reopen: () => (
      <div className={bar}>
        <p>{t.inbox.reopenBar.closed}</p>
        {canReopen && (
          <Button className="w-full sm:min-h-11" onClick={() => setPicking('reopen')}>
            {t.inbox.reopenBar.action}
          </Button>
        )}
        {carrying && (
          <Button variant="secondary" className="w-full sm:min-h-11" onClick={() => setPicking('carry')}>
            {t.inbox.reopenBar.carry}
          </Button>
        )}
      </div>
    ),
  };
  return (
    <>
      {views[state]()}
      {picking && (
        <ReopenDialog
          {...{ thread, context: props.context, teacher: props.teacher }}
          carry={picking === 'carry' ? { text: carry.draft, onSent: carry.clear } : undefined}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  );
}
