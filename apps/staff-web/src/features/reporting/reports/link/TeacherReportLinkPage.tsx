import { useQuery } from '@tanstack/react-query';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { Logo } from '@ab/web-kit/components/ui/display/mark';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { linkProblem, linkReportFormQuery } from './link-api';
import { LinkProblemAlert } from './LinkProblemAlert';
import { LinkReportEntries } from './LinkReportEntries';

/** The signed link (no login) uses the same entries and checks as the signed-in page. */
export function TeacherReportLinkPage({ token }: { token: string }) {
  const query = useQuery(linkReportFormQuery(token));
  return (
    <main className="min-h-screen bg-page px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSwitch />
        </div>
        <Cartouche>{t.reports.formTitle}</Cartouche>
        <p className="text-sm text-ink-2">{t.reports.teacherLink.subtitle}</p>
        {query.isPending && <ListSkeleton />}
        {query.isError && (
          <LinkProblemAlert
            problem={linkProblem(query.error)}
            onRetry={() => void query.refetch()}
          />
        )}
        {query.data && <LinkReportEntries token={token} form={query.data} />}
      </div>
    </main>
  );
}
