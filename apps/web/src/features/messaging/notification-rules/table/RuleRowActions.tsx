import { Button } from '@/components/ui/form/button';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';
import { actionName, failureText, fillText } from '@/features/messaging/notification-rules/rule-text';
import type { RuleRowState } from './use-rule-row';

const r = t.notificationRules;

/**
 * Under a dirty row: «لم يُحفظ: …» (what changed, «… بدلًا من …»), then «حفظ» / «تراجع» («حفظ» is
 * aria-disabled while the draft does not parse); a refused save in words. Not a live region: the
 * section's one always-mounted polite region (RulesSection) announces a failure, so it is never missed.
 */
export function RuleRowActions({ row, name }: { row: RuleRowState; name: string }) {
  const invalid = !row.result.ok;
  const summary = row.result.ok ? row.result.changes.join(t.common.listSeparator) : row.result.error;
  return (
    <div className="grid gap-1.5">
      {row.dirty && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="text-xs text-ink-2">{fillText(r.unsaved, { changes: summary })}</p>
          {row.saving ? (
            <span className="text-xs font-semibold text-ink-2">{r.saving}</span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                aria-label={actionName(t.common.save, name)}
                aria-disabled={invalid || undefined}
                onClick={() => !invalid && row.save()}
              >
                {t.common.save}
              </Button>
              <Button size="sm" variant="ghost" aria-label={actionName(r.undo, name)} onClick={row.revert}>
                {r.undo}
              </Button>
            </span>
          )}
        </div>
      )}
      {row.failure && row.failure !== 'confirmation_required' && (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{failureText(row.failure)}</span>
        </p>
      )}
    </div>
  );
}
