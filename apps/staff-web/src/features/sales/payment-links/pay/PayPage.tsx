import { useQuery } from '@tanstack/react-query';
import { LanguageSwitch, Cartouche, Logo, FormAlert, ApiError, t } from '@ab/web-kit';
import { publicLinkQuery } from '@/features/sales/payment-links/api';
import { PayDetails } from './PayDetails';
import { PayTestNotice } from './PayTestNotice';
import { payScreen, type PayReturn, type PayScreen } from './pay-screen';

const P = t.paymentLinks.pay;

/** The line of each screen; `open` has none (the details and the button say it all). */
const LINE: Record<Exclude<PayScreen, 'open'>, { text: string; tone: 'ok' | 'act' }> = {
  thanks: { text: P.thanks, tone: 'ok' },
  paid: { text: P.paid, tone: 'ok' },
  back: { text: P.back, tone: 'act' },
  processing: { text: P.processing, tone: 'act' },
  expired: { text: P.expired, tone: 'act' },
  cancelled: { text: P.cancelled, tone: 'act' },
};

type Props = { token: string; back: PayReturn };

/** A wrong token (404 link_not_found) gets its own line; anything else the generic one. */
const loadErrorText = (e: unknown): string => (e instanceof ApiError && e.status === 404 ? P.notFound : t.common.error);

/** Public payment page (docs/30, no login); Checkout returns with `?done=1` or `?cancelled=1`. */
export function PayPage({ token, back }: Props) {
  const query = useQuery(publicLinkQuery(token));
  const screen = query.data ? payScreen(query.data.status, back) : null;
  const line = screen && screen !== 'open' ? LINE[screen] : null;
  return (
    <main className="min-h-screen bg-page px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-[520px] gap-5">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSwitch />
        </div>
        <Cartouche>{P.title}</Cartouche>
        <PayTestNotice link={query.data} />
        {query.isPending && (
          <div role="status" aria-busy="true" className="h-40 animate-pulse rounded-lg bg-sunk">
            <span className="sr-only">{t.common.loading}</span>
          </div>
        )}
        {query.isError && <FormAlert>{loadErrorText(query.error)}</FormAlert>}
        {line && (
          <p role="status" data-tone={line.tone} className={line.tone === 'ok' ? 'text-body font-semibold text-ok' : 'text-sm font-semibold text-ink'}>
            {line.text}
          </p>
        )}
        {query.data && <PayDetails token={token} link={query.data} payable={screen === 'open' || screen === 'back'} />}
      </div>
    </main>
  );
}
