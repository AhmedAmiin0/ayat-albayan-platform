import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { monthLabel } from '@/teacher/payout-text';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { assistantsErrorText } from './errors';
import { useGenerateStatements } from './mutations';

export interface GenerateBarProps {
  /** Who would be built: the chosen salesperson or all, minus the frozen ones (generateTargets). */
  targets: readonly string[];
  month: string;
  /** Some statement exists already: «إعادة الحساب». */
  hasRows: boolean;
  /** No salesperson at all: nothing to build. */
  disabled: boolean;
  onNotice: (text: string) => void;
}

/** «احسب كشوف الشهر» (assistantpay.write): asks once, builds or rebuilds the month's drafts. */
export function GenerateBar({ targets, month, hasRows, disabled, onNotice }: GenerateBarProps) {
  const [asking, setAsking] = useState(false);
  const generate = useGenerateStatements();
  const S = t.assistants.statements;
  const m = t.mobileSalesMoney;
  const label = hasRows ? S.regenerate : S.generate;
  const cancel = () => {
    generate.reset();
    setAsking(false);
  };
  return (
    <View style={{ gap: 8 }}>
      {asking && targets.length === 0 ? <Note>{m.nothingToGenerate}</Note> : null}
      {asking && targets.length > 0 ? (
        <InlineConfirm
          message={m.generateAsk.replace('{month}', monthLabel(month)).replace('{count}', String(targets.length))}
          confirmLabel={label}
          busy={generate.isPending}
          onConfirm={() =>
            generate.mutate(
              { assistantIds: targets, month },
              {
                onSuccess: () => {
                  setAsking(false);
                  onNotice(m.done.generate);
                },
              },
            )
          }
          onCancel={cancel}
        />
      ) : (
        <View style={{ alignItems: 'flex-start' }}>
          <Button variant="secondary" label={label} disabled={disabled || asking} onPress={() => setAsking(true)} />
        </View>
      )}
      {generate.isError ? <ErrorLine message={assistantsErrorText(generate.error)} /> : null}
    </View>
  );
}
