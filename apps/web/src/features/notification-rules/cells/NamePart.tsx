import type { NotificationEntryView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { tagsOf } from '../../notification-catalogue/catalogue-text';

/** A row's name and its tags («رسالة تلقائية», «أساسي»), then its trigger in a line. */
export function NamePart({ entry }: { entry: Pick<NotificationEntryView, 'key' | 'automatic' | 'essential' | 'locked'> }) {
  const words = t.notificationCatalogue.entries[entry.key];
  return (
    <span className="grid gap-0.5">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-semibold text-ink">{words.name}</span>
        {tagsOf(entry).map((tag) => (
          <span key={tag} className="rounded-sm border border-rule px-1.5 text-2xs text-ink-3">
            {tag}
          </span>
        ))}
      </span>
      <span className="text-xs text-ink-3">{words.trigger}</span>
    </span>
  );
}
