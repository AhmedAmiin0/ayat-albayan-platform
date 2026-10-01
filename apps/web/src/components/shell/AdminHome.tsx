import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHead } from '@/components/ui/page';
import { t } from '@/lib/i18n';

/**
 * /admin (the landing page after login): the «لوحة التحكم» cartouche over an honest empty state
 * that sends the admin to the inbox, the day's real starting point. No made-up numbers.
 * TODO(R-RPT-01): the KPI strip dashboard (Phase 5) replaces the empty state.
 */
export function AdminHome() {
  return (
    <>
      <PageHead>
        <Cartouche>{t.admin.dashboardTitle}</Cartouche>
      </PageHead>
      <EmptyState
        title={t.admin.homeEmpty}
        action={
          <Link to="/admin/leads" search={{ page: 1 }} className={buttonVariants()}>
            {t.admin.openLeads}
          </Link>
        }
      >
        {t.admin.homeHint}
      </EmptyState>
    </>
  );
}
