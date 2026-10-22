import { formatPhone, type LineHealthView, type NotificationEntryView } from '@ab/shared';
import type { ReactNode } from 'react';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { blockerText, channelsText, numberParts, stateChip, tagsOf, whenText } from './catalogue-text';

const c = t.notificationCatalogue;

/** A labelled fact («إلى: ولي الأمر»): one text run per value, so Arabic shaping never breaks. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="min-w-0 text-xs text-ink-2">
      <span className="text-ink-3">{label}: </span>
      {children}
    </p>
  );
}

/**
 * One row of «ماذا يُرسل ومتى»: the name and its tags, the state chip with its first blocker in
 * words, then to whom, when, through which channel and from which number. Read-only.
 */
export function CatalogueRow({ entry, lines }: { entry: NotificationEntryView; lines: readonly LineHealthView[] }) {
  const words = c.entries[entry.key];
  const blocker = blockerText(entry);
  const tags = tagsOf(entry);
  return (
    <li data-key={entry.key} className="grid gap-2 border-b border-rule py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] sm:gap-x-6">
      <div className="grid min-w-0 gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-ink">{words.name}</span>
          {tags.map((tag) => (
            <span key={tag} className="rounded-sm border border-rule px-1.5 text-2xs text-ink-3">
              {tag}
            </span>
          ))}
        </p>
        <Fact label={c.columns.when}>{whenText(entry)}</Fact>
        <Fact label={c.columns.audience}>{c.audience[entry.audience]}</Fact>
        <Fact label={c.columns.channel}>{channelsText(entry)}</Fact>
        <Fact label={c.columns.number}>
          {numberParts(entry, lines).map((part, i) => (
            <span key={part.label}>
              {i > 0 && t.common.listSeparator}
              {part.label}
              {part.phone && (
                <>
                  {' '}
                  <Ltr>{formatPhone(part.phone)}</Ltr>
                </>
              )}
            </span>
          ))}
        </Fact>
      </div>
      <div className="grid content-start justify-items-start gap-1">
        <span className="sr-only">{c.columns.state}</span>
        <StatusChip {...stateChip(entry)} />
        {blocker && <p className="text-xs text-ink-2">{blocker}</p>}
      </div>
    </li>
  );
}
