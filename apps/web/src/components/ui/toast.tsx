import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { NuqtaGlyph } from './nuqta-glyph';

export interface ToastProps {
  /** Same verb as the action: t.students.created «الطالب اتسجل». */
  message: string;
  /** Called after `duration` ms (paused while hovered) or never when omitted. */
  onDismiss?: () => void;
  /** Text action: «افتح الملف», «تراجع», «جرّب تاني». */
  action?: { label: string; onClick: () => void };
  tone?: 'info' | 'error';
  duration?: number;
}

/**
 * docs/07 §10 toast: role=status at the bottom inline-end. Info uses the inverse tokens with an
 * inverse-gold filled nuqta; error is danger-soft with a struck glyph and a lapis action.
 * Mount it only while there is something to say (one role=status on screen).
 */
export function Toast({ message, onDismiss, action, tone = 'info', duration = 5000 }: ToastProps) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!onDismiss || hovered) return;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [onDismiss, hovered, duration]);

  const error = tone === 'error';
  return (
    <div
      role="status"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'fixed bottom-4 end-4 z-50 flex max-w-[min(460px,calc(100vw-2rem))] items-center gap-3 rounded-lg py-2.5 ps-3.5 pe-2.5 text-sm',
        error
          ? 'bg-danger-soft text-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cinnabar)_40%,transparent)]'
          : 'bg-inverse text-on-inverse shadow-toast',
      )}
    >
      <NuqtaGlyph shape={error ? 'struck' : 'fill'} className={cn('size-[13px]', error ? 'text-danger' : 'text-inverse-gold')} />
      <span>{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            'ms-auto min-h-9 rounded-sm px-2 font-bold underline underline-offset-4',
            error ? 'text-lapis' : 'text-on-inverse',
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
