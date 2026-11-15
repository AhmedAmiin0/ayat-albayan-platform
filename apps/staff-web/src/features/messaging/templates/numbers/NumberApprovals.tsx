import { templateStatusStyle } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { isPartial, type NumberApprovalRow, type NumberApprovalState } from './number-approvals';

const s = t.templates.sendFrom;

const chipOf = (state: NumberApprovalState) =>
  state === 'not_synced'
    ? { tone: 'neutral' as const, glyph: 'hollow' as const, word: s.notSynced }
    : { ...templateStatusStyle[state], word: t.enums.templateStatus[state] };

/**
 * One chip per number the template may go out from (the template status chip styles; «لم يُزامَن بعد»
 * when that number has no synced row), led by «معتمد جزئيًا» when only some of them approved it.
 */
export function NumberApprovals({
  rows,
  name,
}: {
  rows: readonly NumberApprovalRow[];
  name: string;
}) {
  if (rows.length === 0) return null;
  return (
    <ul aria-label={s.approvalsFor.replace('{name}', name)} className="flex flex-wrap gap-1">
      {isPartial(rows) && (
        <li>
          <StatusChip size="sm" tone="act" glyph="half" label={t.notificationRules.approval.some} />
        </li>
      )}
      {rows.map(({ number, state }) => {
        const { word, ...style } = chipOf(state);
        return (
          <li key={number.id} data-number={number.id} data-state={state}>
            <StatusChip
              size="sm"
              {...style}
              label={s.approvalChip.replace('{label}', number.label).replace('{status}', word)}
            />
          </li>
        );
      })}
    </ul>
  );
}
