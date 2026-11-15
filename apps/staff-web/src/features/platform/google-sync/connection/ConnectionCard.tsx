import type { GoogleStatusView } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { ConnectionActions } from './ConnectionActions';
import { GoogleBlock } from '@/features/platform/google-sync/GoogleBlock';
import { accountStyle, errorText, fill, formatAt } from '@/features/platform/google-sync/google-format';
import { RedirectUri } from './RedirectUri';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

const s = t.googleSync.connection;

/** «الحساب المربوط»: status, email, since, last error, the redirect URI and connect / disconnect. */
export function ConnectionCard({ status, onNote }: { status: GoogleStatusView; onNote: (message: string) => void }) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const c = status.connection;
  const [before, after] = s.email.split('{email}');
  return (
    <GoogleBlock title={s.title}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusChip {...accountStyle[c.status]} label={s.status[c.status]} />
        {c.email && (
          <p className="min-w-0 text-sm break-words">
            {before}
            <Ltr className="whitespace-normal break-all">{c.email}</Ltr>
            {after}
          </p>
        )}
      </div>
      {c.connected_at && <p className="text-xs text-ink-3">{fill(s.since, { at: formatAt(c.connected_at, clock) })}</p>}
      {c.last_error && <p className="text-xs text-danger break-words">{fill(s.lastError, { error: errorText(c.last_error) })}</p>}
      {!status.configured && <p className="border-s-2 border-s-act ps-3 text-xs font-semibold text-act">{s.notConfigured}</p>}
      <RedirectUri uri={status.redirect_uri} />
      <div className="grid gap-1">
        <p className="text-xs font-semibold text-ink-2">{s.scopes}</p>
        <ul className="grid gap-0.5 text-2xs text-ink-3">
          {status.scopes.map((scope) => (
            <li key={scope} className="min-w-0 break-all">
              <Ltr className="whitespace-normal">{scope}</Ltr>
            </li>
          ))}
        </ul>
      </div>
      <ConnectionActions status={status} onNote={onNote} />
    </GoogleBlock>
  );
}
