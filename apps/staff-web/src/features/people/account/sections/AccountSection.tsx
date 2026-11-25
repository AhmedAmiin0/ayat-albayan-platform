import { useId, type ReactNode } from 'react';

/** Grouped by space and a hairline, never a box (docs/07 §6). */
export function AccountSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 border-t border-rule py-6 @3xl:grid-cols-[13rem_minmax(0,1fr)] @3xl:gap-x-10"
    >
      <h2 id={id} className="font-display text-h4 leading-normal font-bold text-balance text-ink">
        {title}
      </h2>
      <div className="min-w-0 max-w-[34rem]">{children}</div>
    </section>
  );
}
