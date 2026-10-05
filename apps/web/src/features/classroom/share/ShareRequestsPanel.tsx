import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { ShareRequests } from './use-share-requests';

const S = t.classroom.shareRequest;

/**
 * Above the stage: the staff's «{name} يطلب مشاركة الشاشة» with «سماح» / «رفض», «إيقاف مشاركة
 * {name}» for a guest who may share, and the guest's «سُمح لك…» / «رُفض…» line.
 */
export function ShareRequestsPanel({ share }: { share: ShareRequests }) {
  const { pending, granted, notice } = share;
  if (pending.length === 0 && granted.length === 0 && !notice) return null;
  return (
    <section aria-label={S.title} className="flex flex-wrap items-center gap-2">
      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-md border border-rule bg-raised px-3 py-1.5 text-sm">
          {notice}
          <Button type="button" variant="ghost" size="sm" onClick={share.dismiss}>{t.common.close}</Button>
        </p>
      )}
      {pending.map((tile) => (
        <div key={tile.identity} role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-lapis bg-lapis-wash px-3 py-1.5 text-sm">
          <span>{S.asks.replace('{name}', tile.name)}</span>
          <Button type="button" size="sm" onClick={() => share.allow(tile)}>{S.allow}</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => share.deny(tile)}>{S.deny}</Button>
        </div>
      ))}
      {granted.map((tile) => (
        <Button key={tile.identity} type="button" variant="secondary" size="sm" onClick={() => share.revoke(tile)}>
          {S.stop.replace('{name}', tile.name)}
        </Button>
      ))}
    </section>
  );
}
