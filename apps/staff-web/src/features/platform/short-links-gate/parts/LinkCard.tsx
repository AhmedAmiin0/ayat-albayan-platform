import { useId } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { GateIcon } from './GateIcon';

const G = t.shortLinks.gate;

/** The title stays hidden until the visitor is known (`title` null). */
export function LinkCard({ title }: { title: string | null }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex items-center gap-3 rounded-[20px] border border-rule bg-raised px-4 py-3.5"
    >
      <span
        className="grid size-11 shrink-0 place-items-center rounded-lg bg-lapis-wash text-lapis"
      >
        <GateIcon name="link" />
      </span>
      <span className="flex min-w-0 flex-col">
        {title !== null && <span className="text-xs text-ink-3">{G.linkFrom}</span>}
        <h2 id={id} className="text-base leading-[26px] font-semibold break-words text-ink">
          {title ?? G.fromAcademy}
        </h2>
      </span>
    </section>
  );
}
