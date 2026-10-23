import { formatPhone, type LineHealthView, type NotificationEntryView } from '@ab/shared';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { blockerText, channelsText, numberParts, stateChip, tagsOf, whenText } from './catalogue-text';

const cell = 'border-b border-rule px-2 py-2.5 text-start align-top';

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
      </th>
      <td className={`${cell} text-xs text-ink-2`}>{whenText(entry)}</td>
      <td className={`${cell} text-xs text-ink-2`}>{channelsText(entry)}</td>
      <td className={`${cell} text-xs text-ink-2`}>
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
