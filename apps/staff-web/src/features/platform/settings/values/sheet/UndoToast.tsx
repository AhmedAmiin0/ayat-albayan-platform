import { useEffect, useState } from 'react';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';

export interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  /** 10 s (docs/26b §2 «Saved»); the count pauses while hovered or focused. */
  duration?: number;
}

/**
 * «تم حفظ القيمة» with «تراجع» (the app's toast look, docs/07 §10). Unlike the shared Toast, the
 * timer also pauses while focus is inside, so a keyboard user can reach «تراجع» in time.
 */
export function UndoToast({ message, onUndo, onDismiss, duration = 10_000 }: UndoToastProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (hovered || focused) return;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [hovered, focused, onDismiss, duration]);
  return (
    // Not a live region: «القيم» announces the save once, by name, in its own polite region.
    <div
      data-undo-toast
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="fixed bottom-4 end-4 z-50 flex max-w-[min(460px,calc(100vw-2rem))] animate-toast-in items-center gap-3 rounded-lg bg-inverse py-2.5 ps-3.5 pe-2.5 text-sm text-on-inverse shadow-toast"
    >
      <NuqtaGlyph shape="fill" className="size-[13px] text-inverse-gold" />
      <span>{message}</span>
      <button type="button" onClick={onUndo} className="ms-auto min-h-11 rounded-sm px-2 font-bold text-on-inverse underline underline-offset-4 sm:min-h-9">
        {t.settingsValues.undo}
      </button>
    </div>
  );
}
