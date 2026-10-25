import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import { assistantsQuery } from './api';
import { CommissionLedger } from './CommissionLedger';
import { StatementsPanel } from './StatementsPanel';
import { TermsEditor } from './TermsEditor';
import { commissionText, salaryText } from './terms-summary';
import { useStatementCan } from './use-statement-can';

/** /admin/assistants/:assistantId: this assistant's terms, then their commissions and monthly statements. */
export function AssistantDetailPage({ assistantId }: { assistantId: string }) {
  const list = useQuery(assistantsQuery);
  const can = useStatementCan();
  if (list.isError) return <FormAlert>{t.common.error}</FormAlert>;
  if (!list.data) return <ListSkeleton />;
  const assistant = list.data.find((a) => a.id === assistantId);
  if (!assistant) return <FormAlert>{t.assistants.notFound}</FormAlert>;
  return (
    <>
      <PageHead className="mb-5">
        <Cartouche>{assistant.name}</Cartouche>
        <Link to="/admin/assistants" className={`${buttonVariants({ variant: 'ghost' })} ms-auto`}>
          {t.assistants.back}
        </Link>
      </PageHead>
      {can.write ? (
        <TermsEditor key={assistant.id} assistant={assistant} />
      ) : (
        <dl className="mb-8 flex flex-wrap gap-x-7 gap-y-2 border-b border-rule pb-4 text-sm">
          <dt className="text-xs text-ink-3">{t.assistants.salary}</dt>
          <dd>{salaryText(assistant.terms.salary)}</dd>
          <dt className="text-xs text-ink-3">{t.assistants.commission}</dt>
          <dd>{commissionText(assistant.terms.commission)}</dd>
        </dl>
      )}
      <h2 className="mb-3 font-display text-h4 font-bold">{t.assistants.tabs.commissions}</h2>
      <CommissionLedger assistantId={assistant.id} canWrite={can.write} />
      <h2 className="mt-8 mb-3 font-display text-h4 font-bold">{t.assistants.tabs.statements}</h2>
      <StatementsPanel assistants={[assistant]} assistantId={assistant.id} can={can} />
    </>
  );
}
