import { useId } from 'react';
import { IconButton } from '@/components/ui/form/icon-button';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { useCalls } from '../state/call-context';

export interface CallButtonProps {
  phone: string;
  /** The name the call screen shows (the thread's title in this mode). */
  name: string;
  /** May this user write in this chat (useChatAccess.send, and not a teacher's own chat)? */
  canSend: boolean;
}

/**
 * The phone icon of the thread header, like WhatsApp's (docs/28 §5). Shown only while calls are on and
 * the user may call from this chat; dimmed while the chat line is not on Kapso, its reason tied to the
 * button (aria-describedby) as well as in the tooltip.
 */
export function CallButton({ phone, name, canSend }: CallButtonProps) {
  const ui = useCalls();
  const reasonId = useId();
  if (!ui || !canSend) return null;
  const unavailable = !ui.config.available;
  return (
    <>
      <IconButton
        label={`${t.calls.call}: ${name}`}
        title={unavailable ? t.calls.errors.calls_unavailable : t.calls.call}
        aria-describedby={unavailable ? reasonId : undefined}
        disabled={unavailable || ui.busy}
        onClick={() => ui.call({ phone, name })}
        className="text-lapis"
      >
        <Icon name="call" className="size-5" />
      </IconButton>
      {unavailable && (
        <span id={reasonId} className="sr-only">
          {t.calls.errors.calls_unavailable}
        </span>
      )}
    </>
  );
}
