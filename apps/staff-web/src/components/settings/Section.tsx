import type { ReactNode } from 'react';
import { sectionId } from './section-id';

/** A /admin/settings section: title, then rows (scroll-margin keeps it under the pinned head). */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={sectionId(id)} aria-labelledby={`${sectionId(id)}-title`} className="scroll-mt-24">
      <h2 id={`${sectionId(id)}-title`} className="mb-1 text-h4 font-bold">
        {title}
      </h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
