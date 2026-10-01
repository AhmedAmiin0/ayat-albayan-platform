import { useId, type ReactNode } from 'react';

type ModalProps = { title: string; children: ReactNode };

/** Minimal modal: render it conditionally (`open && <Modal …/>`). No dialog lib installed. */
export function Modal({ title, children }: ModalProps) {
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg"
      >
        <h2 id={titleId} className="mb-4 text-lg font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
