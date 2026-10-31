import { quoteIcon } from '@ab/shared';
import type { RefObject } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { t } from '@/lib/i18n/i18n';
import { useChatActions } from '../../shared/chat-actions';
import { quoteSender, quoteText } from '@/features/messaging/inbox/messages/lib/quote';

/**
 * «الرد على رسالة» above the message box (owner 2026-10-25): one compact line (44px, the phone's
 * reading height stays) with who wrote it, its first line and ✕. Nothing without a target.
 * After ✕ the focus goes back to the box (`returnFocus`).
 */
export function ReplyStrip({ returnFocus }: { returnFocus: RefObject<HTMLElement | null> }) {
  const { target, chat, cancelReply } = useChatActions();
  if (!target) return null;
  const icon = quoteIcon(target);
  return (
    <div
      role="group"
      aria-label={t.inbox.reply.strip}
      className="flex min-h-11 items-center gap-2 rounded-md border-s-[3px] border-lapis bg-lapis-wash ps-2.5 text-xs sm:min-h-10"
    >
      <Icon name="reply" className="size-4 text-lapis" />
      <p className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="max-w-[45%] shrink-0 truncate font-semibold text-lapis" dir="auto">
          {quoteSender(target, chat)}
        </span>
        <span className="min-w-0 truncate text-ink-2" dir="auto">
          {icon && <span aria-hidden="true">{`${icon} `}</span>}
          {quoteText(target)}
        </span>
      </p>
      <IconButton
        label={t.inbox.reply.cancel}
        className="rounded-full"
        onClick={() => {
          cancelReply();
          returnFocus.current?.focus();
        }}
      >
        <Icon name="x" className="size-4" />
      </IconButton>
    </div>
  );
}
