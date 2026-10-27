import type { ReactNode } from 'react';

/** A calm, announced note: «أرسلنا رمزًا…», «حُفظت كلمة المرور…». */
export function StatusNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-md bg-accent px-3 py-2.5 text-sm text-pretty text-ink">
      {children}
    </p>
  );
}
