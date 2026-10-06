import type { UserDetail } from '@ab/shared';
import { StatusChip } from '@/components/ui/status-chip';
import { Ltr } from '@/components/ui/ltr';
import { formatDateTime } from '@/features/leads/format';
import { t } from '@/lib/i18n';

const L = t.users.link;

/** Status, the linked record and the dates, above the edit fields. */
export function UserSummary({ user }: { user: UserDetail }) {
  const disabled = user.status === 'disabled';
  return (
    <dl className="grid gap-2 border-b border-rule pb-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <dt className="text-xs text-ink-3">{t.users.detail.status}</dt>
        <dd>
          <StatusChip tone={disabled ? 'bad' : 'ok'} glyph={disabled ? 'struck' : 'fill'} label={t.users.status[user.status]} />
        </dd>
      </div>
      {disabled && user.disabled_reason && <p className="text-xs text-ink-2">{t.users.detail.disabledReason.replace('{reason}', user.disabled_reason)}</p>}
      <div className="flex flex-wrap gap-2">
        <dt className="text-xs text-ink-3">{L.label}</dt>
        <dd className="text-ink-2">
          {user.linked ? (
            <>
              {t.users.kinds[user.linked.kind]}: {user.linked.name}
              {user.linked.code && (
                <>
                  {' '}
                  <Ltr>{user.linked.code}</Ltr>
                </>
              )}
            </>
          ) : (
            L.none
          )}
        </dd>
      </div>
      <div className="flex flex-wrap gap-2">
        <dt className="text-xs text-ink-3">{t.users.cols.lastSignIn}</dt>
        <dd className="text-ink-2">{user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : t.users.never}</dd>
      </div>
    </dl>
  );
}
