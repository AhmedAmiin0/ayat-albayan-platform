import type { AssistantTermsView } from '@ab/money';
import { t, type, useTheme, AppText } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { CardTitle } from './CardTitle';
import { MoneyCard } from './MoneyCard';
import { commissionNote, myCommissionText, salaryFrom } from '@/sales-money/lib/money-text';

const p = t.assistantPortal.earnings;

/** Read-only. */
export function EarningsTermsCard({ terms }: { terms: AssistantTermsView | null }) {
  const { color } = useTheme();
  const { salary, commission } = terms ?? { salary: null, commission: null };
  const body = { fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink, fontVariant: ['tabular-nums' as const] };
  return (
    <MoneyCard>
      <CardTitle>{p.terms}</CardTitle>
      {!salary && !commission ? <Note>{p.noTerms}</Note> : null}
      {salary ? <AppText style={body}>{`${p.salary}: ${salaryFrom(salary)}`}</AppText> : null}
      {commission ? (
        <AppText style={body}>{`${p.commission}: ${myCommissionText(commission)}`}</AppText>
      ) : null}
      {commission ? (
        <Note>{commissionNote(commission.starts_on, terms?.renewal_share_percent)}</Note>
      ) : null}
      {terms && !commission && salary ? <Note>{p.noCommission}</Note> : null}
    </MoneyCard>
  );
}
