import { formatPhone, WA_LINES, type LineHealthView } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import { formatDateTime } from '../../sales/leads/format';

const c = t.notificationCatalogue;

/**
 * Each WhatsApp number as the last good «افحص الخطوط» kept it (docs/23a §E H2): shown without a
 * new Meta call; «لم يُفحص الرقم بعد» until a check succeeds once.
 */
export function NumbersLine({ lines }: { lines: readonly LineHealthView[] }) {
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
              {kept && <span className="text-ink-3"> · {c.checkedAt.replace('{time}', formatDateTime(kept.checked_at))}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
