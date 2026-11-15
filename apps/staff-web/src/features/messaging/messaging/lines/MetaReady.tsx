import type { LineCheckView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

type Ready = NonNullable<LineCheckView['meta_ready']>;
type Label = keyof typeof t.templates.settings.lines;

/** Each fact with its «set» and «missing» sentence. */
const ROWS: readonly (readonly [keyof Ready, Label, Label])[] = [
  ['app_secret', 'metaAppSecretSet', 'metaAppSecretMissing'],
  ['verify_token', 'metaVerifyTokenSet', 'metaVerifyTokenMissing'],
  ['app_subscribed', 'metaAppSubscribed', 'metaAppNotSubscribed'],
];

/**
 * «الجاهزية للإرسال عبر ميتا مباشرة» (docs/19 «CRM → Meta»): on a meta line, and on a crm line
 * before its switch, whether the app secret and the verify token are set and the app subscribed to
 * the WABA. A fact the server could not learn (null) is left out; nothing without the block.
 */
export function MetaReady({ ready }: { ready: Ready | undefined }) {
  const s = t.templates.settings.lines;
  if (!ready) return null;
  const rows = ROWS.filter(([key]) => ready[key] !== null);
  return (
    <div data-testid="meta-ready" className="grid gap-1 text-xs">
      <p className="text-ink-3">{s.metaReady}</p>
      {rows.map(([key, ok, missing]) => (
        <p key={key} className={ready[key] ? 'text-ok' : 'text-act'}>
          {ready[key] ? s[ok] : s[missing]}
        </p>
      ))}
    </div>
  );
}
