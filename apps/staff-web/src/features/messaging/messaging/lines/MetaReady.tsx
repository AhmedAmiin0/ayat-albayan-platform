import type { LineCheckView } from '@ab/shared';
import { t } from '@ab/web-kit';

type Ready = NonNullable<LineCheckView['meta_ready']>;
type Label = keyof typeof t.templates.settings.lines;

/** Each fact with its «set» and «missing» sentence. */
const ROWS: readonly (readonly [keyof Ready, Label, Label])[] = [
  ['app_secret', 'metaAppSecretSet', 'metaAppSecretMissing'],
  ['verify_token', 'metaVerifyTokenSet', 'metaVerifyTokenMissing'],
  ['app_subscribed', 'metaAppSubscribed', 'metaAppNotSubscribed'],
];

/** A fact the server could not learn (null) is left out (docs/19). */
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
