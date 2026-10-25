import type { AssistantTermsView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { localDay } from '@/payments/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { CardTitle } from './CardTitle';
import { MoneyCard } from './MoneyCard';
import { myCommissionText, salaryFrom } from '../lib/money-text';

const p = t.assistantPortal.earnings;

/** «شروطي» (web EarningsTerms): my monthly salary and my commission, as the administration set them. Read-only. */
export function EarningsTermsCard({ terms }: { terms: AssistantTermsView | null }) {
  const { color } = useTheme();
  const { salary, commission } = terms ?? { salary: null, commission: null };
  const body = { fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink, fontVariant: ['tabular-nums' as const] };
  return (
    <MoneyCard>
      <CardTitle>{p.terms}</CardTitle>
      {!salary && !commission ? <Note>{p.noTerms}</Note> : null}
      {salary ? <AppText style={body}>{`${p.salary}: ${salaryFrom(salary)}`}</AppText> : null}
      {commission ? <AppText style={body}>{`${p.commission}: ${myCommissionText(commission)}`}</AppText> : null}
      {commission ? <Note>{p.commissionNote.replace('{date}', localDay(commission.starts_on))}</Note> : null}
      {terms && !commission && salary ? <Note>{p.noCommission}</Note> : null}
    </MoneyCard>
  );
}
