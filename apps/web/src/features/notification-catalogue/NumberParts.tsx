import { formatPhone, type LineHealthView, type NotificationEntryView } from '@ab/shared';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { numberParts } from './catalogue-text';

/** «من رقم» of one notification: each line's name, then its number as an LTR island (never «0001 … 20+»). */
export function NumberParts({ entry, lines }: { entry: NotificationEntryView; lines: readonly LineHealthView[] }) {
  return (
    <>
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
    </>
  );
}
