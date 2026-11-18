import { paymentInstructions } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import {
  FAM_CARD, FAM_CARD_TITLE, FAM_EMPTY, FAM_SIDE, FAM_SPLIT,
} from '@ab/web-kit/family/panels/panel-look';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { portalPackageQuery } from '@ab/web-kit/portal/api';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import { PackageCard } from './PackageCard';
import { PaymentsList } from './PaymentsList';

/** «طريقة الدفع»: the academy's transfer text (the family look: a card with a teal edge). */
function Instructions({ text }: { text: string }) {
  return (
    <section
      aria-label={t.portal.paymentInstructions}
      className={cn('grid gap-1', FAM_CARD.teal, 'family:gap-3')}
    >
      <h3 className={cn('text-sm font-semibold text-ink-2', FAM_CARD_TITLE)}>
        {t.portal.paymentInstructions}
      </h3>
      <p
        className="whitespace-pre-line rounded-lg bg-sunk p-3 text-sm family:rounded-[14px]
          family:px-4 family:py-3.5 family:text-[15px] family:leading-[1.9]"
      >
        {text}
      </p>
    </section>
  );
}

/**
 * «الباقة» (docs/50 §2), a guardian's or an adult student's only: the package, lessons used and
 * left, the dates, the amount due, the payments and the academy's transfer text. No WhatsApp link.
 * The family look (board PortalWebPackage): the package card, then a column of the payments and
 * the transfer text beside it on a wide screen.
 */
export function PackagePanel({ student }: { student: PortalStudent }) {
  const query = useQuery(portalPackageQuery(student.id));
  return (
    <LoadState query={query}>
      {(view) => {
        const instructions = paymentInstructions(view);
        return (
          <div className={cn('grid gap-4', FAM_SPLIT)}>
            {view.package ? (
              <PackageCard pkg={view.package} />
            ) : (
              <EmptyState title={t.portal.packageEmpty} className={FAM_EMPTY}>
                {t.portal.packageEmptyHint}
              </EmptyState>
            )}
            <div className={FAM_SIDE}>
              <PaymentsList payments={view.payments} />
              {instructions && <Instructions text={instructions} />}
            </div>
          </div>
        );
      }}
    </LoadState>
  );
}
