import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { REQUEST_TEXT } from './request-text';
import type { ShareRequests } from './use-share-requests';

const S = t.classroom.shareRequest;

/**
 * Above the stage, one list for every request: the staff's «{name} يطلب …» with «سماح» / «رفض»,
 * «إيقاف مشاركة {name}» / «إيقاف كتابة {name}» for a guest who may, and the guest's «سُمح لك…» /
 * «رُفض…» line.
 */
export function ShareRequestsPanel({ share }: { share: ShareRequests }) {
  const { pending, granted, drawers, notice } = share;
  if (pending.length === 0 && granted.length === 0 && drawers.length === 0 && !notice) return null;
  return (
    <section aria-label={t.classroom.boardRequest.title} className="flex flex-wrap items-center gap-2">
      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-md border border-rule bg-raised px-3 py-1.5 text-sm">
          {notice}
          <Button type="button" variant="ghost" size="sm" onClick={share.dismiss}>{t.common.close}</Button>
        </p>
      )}
      {pending.map((p) => (
        <div key={`${p.tile.identity}:${p.what}`} role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-lapis bg-lapis-wash px-3 py-1.5 text-sm">
          <span>{REQUEST_TEXT[p.what].asks.replace('{name}', p.tile.name)}</span>
          <Button type="button" size="sm" onClick={() => share.allow(p)}>{S.allow}</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => share.deny(p)}>{S.deny}</Button>
        </div>
      ))}
      {granted.map((tile) => (
        <Button key={tile.identity} type="button" variant="secondary" size="sm" onClick={() => share.revoke(tile)}>
          {S.stop.replace('{name}', tile.name)}
        </Button>
      ))}
      {drawers.map((tile) => (
        <Button key={`${tile.identity}:draw`} type="button" variant="secondary" size="sm" onClick={() => share.revokeDraw(tile)}>
          {t.classroom.boardRequest.draw.stop.replace('{name}', tile.name)}
        </Button>
      ))}
    </section>
  );
}
