import { formatPhone } from '@ab/core';
import { Link } from '@tanstack/react-router';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { VALUES_GROUP } from '@/features/platform/settings/pages/page-search';
import { LINK } from './overview-table';

const h = t.communicationsHub;

/** Read-only here; edited on the values page (docs/23 §2d). */
export function PublicNumber({ e164 }: { e164: string }) {
  return (
    <section aria-labelledby="overview-public-number" className="grid gap-1">
      <h2 id="overview-public-number" className="text-h4 font-bold">
        {h.publicNumber}
      </h2>
      <p className="flex flex-wrap items-center gap-x-3 text-sm">
        {e164 ? <Ltr className="font-semibold">{formatPhone(e164)}</Ltr> : <span className="text-ink-3">{h.publicNumberNone}</span>}
        <Link to="/admin/settings/values" search={{ group: VALUES_GROUP.academy }} className={LINK}>
          {h.publicNumberEdit}
        </Link>
      </p>
    </section>
  );
}
