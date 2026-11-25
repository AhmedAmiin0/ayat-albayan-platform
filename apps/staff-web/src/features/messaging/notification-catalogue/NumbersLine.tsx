import type { LineHealthView } from '@ab/shared';
import { WA_LINES } from '@ab/catalog';
import { formatPhone } from '@ab/core';
import { Ltr, t, useClock } from '@ab/web-kit';
import { formatDateTime } from '@/features/sales/leads/format';

const c = t.notificationCatalogue;

/** Shown from the last good check without a new Meta call (docs/23a §E H2). */
export function NumbersLine({ lines }: { lines: readonly LineHealthView[] }) {
  const clock = useClock();
  return (
    <div className="grid gap-1 text-xs">
      <p className="font-semibold text-ink-2">{c.numbersTitle}</p>
      <ul className="grid gap-1">
        {WA_LINES.map((line) => {
          const kept = lines.find((l) => l.line === line);
          return (
            <li key={line} className="text-ink-2">
              <span>{c.lines[line]}: </span>
              {kept?.display_phone_e164 ? <Ltr>{formatPhone(kept.display_phone_e164)}</Ltr> : <span className="text-ink-3">{c.notChecked}</span>}
              {kept && <span className="text-ink-3"> · {c.checkedAt.replace('{time}', formatDateTime(kept.checked_at, clock))}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
