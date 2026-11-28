import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import type { MuteToastsProps } from './MuteToasts.types';
import { useMuteToasts } from './use-mute-toasts';

/** One toast at a time. */
export function MuteToasts({ room, mute }: MuteToastsProps) {
  const { muted } = useMuteToasts({ room });
  if (muted.notice)
    return <Toast message={muted.notice} onDismiss={muted.dismiss} className="bottom-24" />;
  if (mute.toast)
    return (
      <Toast
        message={mute.toast.message}
        tone={mute.toast.tone}
        onDismiss={mute.dismiss}
        className="bottom-24"
      />
    );
  return null;
}
