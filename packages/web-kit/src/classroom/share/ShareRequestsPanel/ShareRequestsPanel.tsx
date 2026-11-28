import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PanelNotice } from './PanelNotice';
import { PendingAsk } from './PendingAsk';
import { StopButton } from './StopButton';
import { isQuiet } from './share-requests-panel.helpers';
import type { ShareRequestsPanelProps } from './ShareRequestsPanel.types';

export function ShareRequestsPanel({ share }: ShareRequestsPanelProps) {
  const stopShare = t.classroom.shareRequest.stop;
  const stopDraw = t.classroom.boardRequest.draw.stop;
  if (isQuiet(share)) return null;
  return (
    <section
      aria-label={t.classroom.boardRequest.title}
      className="flex flex-wrap items-center gap-2"
    >
      <PanelNotice notice={share.notice} onDismiss={share.dismiss} />
      {share.pending.map((p) => (
        <PendingAsk key={`${p.tile.identity}:${p.what}`} share={share} ask={p} />
      ))}
      {share.granted.map((tile) => (
        <StopButton
          key={tile.identity}
          label={stopShare.replace('{name}', tile.name)}
          onStop={() => share.revoke(tile)}
        />
      ))}
      {share.drawers.map((tile) => (
        <StopButton
          key={`${tile.identity}:draw`}
          label={stopDraw.replace('{name}', tile.name)}
          onStop={() => share.revokeDraw(tile)}
        />
      ))}
    </section>
  );
}
