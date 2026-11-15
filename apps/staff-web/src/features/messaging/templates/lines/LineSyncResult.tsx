import type { TemplateLineSync } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import { syncFailedText } from '@/features/messaging/templates/api';
import { skipReasonText } from '@/features/messaging/templates/skip-reasons';

/** Imported keys and skipped names are Meta's own (English) words: LTR islands that may wrap; the reasons are ours. */
const WRAP = 'whitespace-normal break-all';

/**
 * What one number's sync found: the WABA's template count, the rows it re-checked, the keys it
 * imported and what it skipped (each reason code in words). A failed read says why instead.
 */
export function LineSyncResult({ sync }: { sync: TemplateLineSync }) {
  const p = t.templates.perNumber;
  if (!sync.ok) {
    return (
      <p className="text-xs font-semibold whitespace-normal text-danger">
        {syncFailedText(sync)}
      </p>
    );
  }
  const [before, between, after] = p.skipReason.split(/\{name\}|\{reason\}/);
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
      <dt className="text-ink-3">{p.metaCount}</dt>
      <dd className="tabular-nums">{sync.meta_count}</dd>
      <dt className="text-ink-3">{p.checkedRows}</dt>
      <dd className="tabular-nums">{sync.synced}</dd>
      <dt className="text-ink-3">{p.imported}</dt>
      <dd>
        {sync.imported.length === 0 ? (
          <span className="text-ink-3">{p.noneImported}</span>
        ) : (
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {sync.imported.map((key) => (
              <Ltr key={key} className={WRAP}>
                {key}
              </Ltr>
            ))}
          </span>
        )}
      </dd>
      {sync.skipped.length > 0 && (
        <>
          <dt className="text-ink-3">{p.skipped}</dt>
          <dd>
            <ul className="grid gap-0.5 text-ink-2">
              {sync.skipped.map((s) => (
                <li key={s.name}>
                  {before}
                  <Ltr className={WRAP}>{s.name}</Ltr>
                  {between}
                  {skipReasonText(s.reason)}
                  {after}
                </li>
              ))}
            </ul>
          </dd>
        </>
      )}
    </dl>
  );
}
