import type { AssistantTermsView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { AmountText } from '@/sales-money/AmountText';
import { CardTitle } from '@/sales-money/CardTitle';
import { MoneyCard } from '@/sales-money/MoneyCard';
import { commissionText, salaryText, sinceText } from '@/sales-money/money-text';
import { AppText } from '@/ui/AppText';

/** The terms read-only (an admin without assistantpay.write, as the web's summary line). */
export function TermsView({ terms }: { terms: AssistantTermsView }) {
  const salarySince = sinceText(terms.salary?.starts_on);
  const commissionSince = sinceText(terms.commission?.starts_on);
  return (
    <MoneyCard>
      <CardTitle>{t.assistants.terms.title}</CardTitle>
      <Note>{t.assistants.salary}</Note>
      {terms.salary ? <AmountText amount={terms.salary.amount} currency={terms.salary.currency} strong /> : <AppText>{salaryText(null)}</AppText>}
      {salarySince ? <Note>{salarySince}</Note> : null}
      <Note>{t.assistants.commission}</Note>
      <AppText>{commissionText(terms.commission)}</AppText>
      {commissionSince ? <Note>{commissionSince}</Note> : null}
    </MoneyCard>
  );
}
