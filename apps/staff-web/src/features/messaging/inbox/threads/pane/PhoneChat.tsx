import type { ReactNode } from 'react';

// The whole dynamic viewport, clear of the notch and the side insets (the composer keeps the bottom one).
const FRAME =
  'fixed inset-x-0 top-0 z-40 flex h-dvh flex-col overflow-hidden bg-page pt-[env(safe-area-inset-top)] ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)]';

/** Dialogs and toasts (z-50) still open above the full-screen chat. */
export function PhoneChat({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  return (
    <section aria-labelledby={labelledBy} data-testid="phone-chat" className={FRAME}>
      {children}
    </section>
  );
}
