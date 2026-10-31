import type { MessageView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { clockText, fullTime } from '@/features/messaging/inbox/format';
import { BUBBLE_ROW } from '@/features/messaging/inbox/messages/lib/bubble-side';
import { bubbleId } from '@/features/messaging/inbox/messages/lib/jump-to-message';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';
import { useHide } from './use-hide';
import { useHideRights } from './use-hide-rights';

const h = t.inbox.hide;

/**
 * A message hidden from the platform («حذف من المنصة», owner 2026-10-30): a muted placeholder that
 * says
 * it is still on the customer's phone, who hid it and when; no content, file or actions, only
 * «إظهار»
 * for the admin.
 */
export function HiddenBubble({ message: m }: { message: MessageView }) {
  const clock = useClock();
  const { unhide: mayShow } = useHideRights();
  const calls = useHide(useChatActions().chat.phone);
  const hidden = m.hidden;
  const at = hidden ? clockText(hidden.at, clock) : '';
  const by = hidden?.by_name ? h.by.replace('{name}', hidden.by_name) : h.byUnknown;
  return (
    <li
      id={bubbleId(m.id)}
      data-message-id={m.id}
      tabIndex={-1}
      className={cn('flex', BUBBLE_ROW[m.direction === 'outbound' ? 'outbound' : 'inbound'])}
    >
      <article className="grid max-w-[min(85%,560px)] gap-1 rounded-lg border border-dashed border-rule px-3.5 py-2.5 text-sm">
        <p className="italic text-ink-3">{h.placeholder}</p>
        <p className="text-2xs text-ink-3" title={hidden ? fullTime(hidden.at, clock) : undefined}>
          {by.replace('{time}', at)}
        </p>
        {calls.failed && (
          <p role="alert" className="text-2xs text-destructive">
            {h.failed}
          </p>
        )}
        {mayShow && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="justify-self-start"
            disabled={calls.unhide.isPending}
            onClick={() => calls.unhide.mutate(m.id)}
          >
            {h.unhide}
          </Button>
        )}
      </article>
    </li>
  );
}
