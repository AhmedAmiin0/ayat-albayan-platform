import type { CommsSource, ParityView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmSwitchDialog } from '@/components/settings/dialogs/ConfirmSwitchDialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';
import { numberErrorText } from '../form/number-errors';
import { setCommsSource } from '../numbers-api';
import { SourceButtons } from './SourceButtons';
import { useNumbersMutation } from '../use-numbers-mutation';

const s = t.numbers.source;

/**
 * «مصدر إعداد الأرقام» (settings.comms_source): the source in use, and the switch. To «الأرقام» only
 * while the parity is empty (the API refuses otherwise); back to the current setup always. Both ask
 * first, stating the consequence; a refusal stays inside the dialog.
 */
export function SourceSwitch({ parity, manage }: { parity: ParityView; manage: boolean }) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<CommsSource | null>(null);
  const save = useNumbersMutation(setCommsSource, {
    note: s.changed,
    onDone: () => {
      setTarget(null);
      void queryClient.invalidateQueries({ queryKey: CONFIG_QUERY_KEYS.settings });
    },
  });
  const open = (next: CommsSource) => {
    save.reset();
    setTarget(next);
  };
  const diffs = parity.differences.length;
  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-bold">{s.title}</h3>
      <div className="flex flex-wrap items-center gap-3">
        <StatusChip tone={parity.source === 'module' ? 'ok' : 'neutral'} glyph="fill" label={s.current.replace('{{source}}', s[parity.source])} />
        {manage && <SourceButtons parity={parity} onPick={open} />}
      </div>
      {target && (
        <ConfirmSwitchDialog
          title={s.confirmTitle}
          description={target === 'module' ? s.confirmModule : s.confirmLegacy}
          yes={s.confirm}
          onYes={() => save.mutate(target)}
          onClose={() => setTarget(null)}
          pending={save.isPending}
          failed={false}
        >
          {target === 'module' && (
            <p className="text-sm font-semibold text-ink">
              {diffs > 0 ? t.numbers.parity.count.replace('{{count}}', String(diffs)) : t.numbers.parity.empty}
            </p>
          )}
          {save.isError && <FormAlert className="mt-3">{numberErrorText(save.error)}</FormAlert>}
        </ConfirmSwitchDialog>
      )}
    </div>
  );
}
