import type { ChannelSenderLabel } from '@ab/shared';
import type { ReactNode } from 'react';
import { ChatGlyph } from '#/components/channel/bubble/ChatGlyph.tsx';
import { Avatar } from '#/components/ui/display/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';

const c = t.studentChannel;

interface Person {
  name: string;
  role: ChannelSenderLabel;
  /** When she read it, on the viewer's clock ('' = not yet). */
  when: string;
}

interface Props {
  title: string;
  /** ✓✓ blue for «قرأها», ✓ grey for «لم يقرأها بعد». */
  read: boolean;
  people: readonly Person[];
}

/** One list of the dialog: its heading and its rows, or «لا أحد بعد». */
export function ReadsList({ title, read, people }: Props) {
  const rows: ReactNode =
    people.length === 0 ? (
      <p className="text-sm text-ink-3">{c.reads.none}</p>
    ) : (
      <ul className="grid gap-2">
        {people.map((p) => (
          <li key={`${p.name}-${p.role}`} className="flex items-center gap-2.5">
            <Avatar name={p.name || c.roles[p.role]} size="sm" decorative />
            <span className="min-w-0 flex-1 truncate text-sm">
              {p.name} · <span className="text-ink-3">{c.roles[p.role]}</span>
            </span>
            {p.when && <span className="text-2xs text-ink-3 tabular-nums">{p.when}</span>}
          </li>
        ))}
      </ul>
    );
  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-1.5 text-sm font-bold">
        <ChatGlyph name={read ? 'checks' : 'check'} className={cn('size-4', read ? 'text-read' : 'text-tick')} />
        {title}
      </h3>
      {rows}
    </section>
  );
}
