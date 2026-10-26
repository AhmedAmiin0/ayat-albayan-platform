import { Link } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/display/skeleton';
import { useCatalogue } from '@/features/messaging/notification-catalogue/use-catalogue';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { communicationsSearch } from '../../page-search';
import { audienceCounts } from './overview-counts';
import { CELL, LINK, TH } from './overview-table';

const h = t.communicationsHub;

/**
 * «ماذا يُرسل الآن» on «نظرة عامة» (docs/23 §2d): per audience, how many notifications send now and how
 * many do not, from the rows' own state (GET /admin/notifications, the cache «الإشعارات» reads). Each
 * row opens «الإشعارات» on its audience, where the reasons are spelled out. With WhatsApp messaging
 * off the counted rows reach people in the app only, and a line under the table says so.
 */
export function OverviewWhat({ messagingOn }: { messagingOn: boolean }) {
  const list = useCatalogue();
  return (
    <section aria-labelledby="overview-what" className="grid min-w-0 gap-2">
      <h2 id="overview-what" className="text-h4 font-bold">
        {h.whatTitle}
      </h2>
      {list.isPending && (
        <div aria-busy="true" className="grid gap-2 py-2">
          <span className="sr-only">{t.common.loading}</span>
          <Skeleton className="w-2/3" />
          <Skeleton className="w-1/2" />
        </div>
      )}
      <div aria-live="polite">
        {list.isError && <p className="text-sm text-ink-2">{t.notificationCatalogue.loadError}</p>}
      </div>
      {list.data && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="mb-1 text-start text-xs text-ink-3">{h.whatCaption}</caption>
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  {h.colAudience}
                </th>
                <th scope="col" className={cn(TH, 'w-24')}>
                  {h.colOn}
                </th>
                <th scope="col" className={cn(TH, 'w-24')}>
                  {h.colOff}
                </th>
                <th scope="col" className={cn(TH, 'w-16')}>
                  <span className="sr-only">{h.colOpen}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {audienceCounts(list.data.entries).map((row) => (
                <tr key={row.audience} data-audience={row.audience}>
                  <th scope="row" className={cn(CELL, 'font-semibold')}>
                    {row.label}
                  </th>
                  <td className={cn(CELL, 'tabular-nums', row.on > 0 && 'font-semibold text-ok')}>
                    {row.on}
                  </td>
                  <td className={cn(CELL, 'tabular-nums text-ink-2')}>{row.off}</td>
                  <td className={CELL}>
                    <Link
                      to="/admin/settings/communications"
                      search={communicationsSearch('catalogue', row.audience)}
                      aria-label={h.openAudience.replace('{audience}', row.label)}
                      className={LINK}
                    >
                      {h.colOpen}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && !messagingOn && <p className="text-xs text-ink-3">{h.inAppOnlyNote}</p>}
    </section>
  );
}
