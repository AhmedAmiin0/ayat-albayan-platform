import type { LineHealthView, NotificationEntryView } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { Ltr, t } from '@ab/web-kit';
import { numberParts } from './catalogue-text';

/** The number is an LTR island so it never renders reversed. */
export function NumberParts({
  entry,
  lines,
}: {
  entry: NotificationEntryView;
  lines: readonly LineHealthView[];
}) {
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
