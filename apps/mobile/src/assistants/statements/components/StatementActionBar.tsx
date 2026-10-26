import type { AssistantStatementView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { statementMonth } from '@/sales-money/lib/money-text';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { assistantsErrorText } from '../../api/errors';
import { useStatementMove } from '../../api/mutations';
import { ReasonConfirm } from './ReasonConfirm';
import { StatementButtons } from './StatementButtons';
import type { StatementCan } from '../hooks/statement-can';

type Move = 'approve' | 'reopen' | 'unpay';
export interface StatementActionBarProps {
  statement: AssistantStatementView;
  can: StatementCan;
  linesOpen: boolean;
  onLines: () => void;
  onPay: () => void;
  onNotice: (text: string) => void;
}

/** The web's actions for the state and permission; approve and reopen ask once, un-pay asks why, pay opens the form. */
export function StatementActionBar({ statement: s, can, linesOpen, onLines, onPay, onNotice }: StatementActionBarProps) {
  const [asking, setAsking] = useState<Move | null>(null);
  const move = useStatementMove();
  const S = t.assistants.statements;
  const m = t.mobileSalesMoney;
  const run = (next: Move, reason = '') =>
    move.mutate(next === 'unpay' ? { id: s.id, move: next, reason } : { id: s.id, move: next }, {
      onSuccess: () => {
        setAsking(null);
        onNotice(m.done[next]);
      },
    });
  const cancel = () => {
    move.reset();
    setAsking(null);
  };
  const error = move.isError ? <ErrorLine message={assistantsErrorText(move.error)} /> : null;
  if (asking === 'unpay') {
    return (
      <View style={{ gap: 8 }}>
        <ReasonConfirm
          message={`${S.unpayTitle.replace('{assistant}', s.assistant.name)}. ${S.unpayBody}`}
          confirmLabel={t.finance.unpay}
          busy={move.isPending}
          onConfirm={(reason) => run('unpay', reason)}
          onCancel={cancel}
        />
        {error}
      </View>
    );
  }
  if (asking) {
    const approve = asking === 'approve';
    const message = approve
      ? m.approveAsk.replace('{assistant}', s.assistant.name).replace('{month}', statementMonth(s))
      : `${S.reopenTitle.replace('{assistant}', s.assistant.name)}. ${S.reopenBody}`;
    return (
      <View style={{ gap: 8 }}>
        <InlineConfirm
          message={message}
          confirmLabel={approve ? t.payouts.approve : t.finance.reopen}
          busy={move.isPending}
          onConfirm={() => run(asking)}
          onCancel={cancel}
        />
        {error}
      </View>
    );
  }
  return <StatementButtons statement={s} can={can} linesOpen={linesOpen} onAction={(a) => (a === 'details' ? onLines() : a === 'pay' ? onPay() : setAsking(a))} />;
}
