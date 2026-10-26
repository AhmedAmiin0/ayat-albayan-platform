import { formatPhone } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import { VALUES_GROUP } from '../../page-search';
import { LINK } from './overview-table';

const h = t.communicationsHub;

/**
 * «الرقم المعلن للأسر» (academy_whatsapp_e164, docs/23 §2d): shown here read-only (LTR), still edited in
 * «القيم» › «الأكاديمية», which the link opens.
 */
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
