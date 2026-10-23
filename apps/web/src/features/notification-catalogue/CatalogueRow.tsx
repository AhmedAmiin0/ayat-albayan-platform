import type { LineHealthView, NotificationEntryView } from '@ab/shared';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { NumberParts } from './NumberParts';
import { blockerText, channelsText, stateChip, tagsOf, whenText } from './catalogue-text';

const cell = 'border-b border-rule px-2 py-2.5 text-start align-top';
/** «متى», «عبر» and «من رقم» are their own columns from 640px; on a phone they sit under the name. */
const wideCell = `${cell} text-xs text-ink-2 max-sm:hidden`;

/**
 * One row of «ماذا يُرسل ومتى»: the name and its tags, when, through which channel, from which
 * number, then the state chip with its first blocker in words. Read-only. The audience is the tab.
 */
export function CatalogueRow({ entry, lines }: { entry: NotificationEntryView; lines: readonly LineHealthView[] }) {
  const words = t.notificationCatalogue.entries[entry.key];
  const blocker = blockerText(entry);
  const tags = tagsOf(entry);
  return (
    <tr data-key={entry.key}>
      <th scope="row" className={`${cell} font-normal`}>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-ink">{words.name}</span>
          {tags.map((tag) => (
            <span key={tag} className="rounded-sm border border-rule px-1.5 text-2xs text-ink-3">
              {tag}
            </span>
          ))}
        </p>
        <p data-phone-details="" className="mt-1 grid gap-0.5 text-xs text-ink-2 sm:hidden">
          <span>{whenText(entry)}</span>
          <span>
            {channelsText(entry)} · <NumberParts entry={entry} lines={lines} />
          </span>
        </p>
      </th>
      <td className={wideCell}>{whenText(entry)}</td>
      <td className={wideCell}>{channelsText(entry)}</td>
      <td className={wideCell}>
        <NumberParts entry={entry} lines={lines} />
      </td>
      <td className={cell}>
        <div className="grid justify-items-start gap-1">
          <StatusChip {...stateChip(entry)} />
          {blocker && <p className="text-xs text-ink-2">{blocker}</p>}
        </div>
      </td>
    </tr>
  );
}
