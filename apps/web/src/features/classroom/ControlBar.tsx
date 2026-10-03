import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { RoomController } from './use-room';

/** Each toggle names the action and carries a glyph (fill = on, struck = off), so colour is never alone. */
function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" size="md" aria-pressed={on} onClick={onClick}>
      <NuqtaGlyph shape={on ? 'fill' : 'struck'} />
      {label}
    </Button>
  );
}

export function ControlBar({ room }: { room: RoomController }) {
  const { snap } = room;
  return (
    <div role="toolbar" aria-label={t.classroom.title} className="flex flex-wrap items-center justify-center gap-2 pb-[env(safe-area-inset-bottom)]">
      {!snap.canPlayAudio && (
        <Button type="button" onClick={room.enableAudio}>
          {t.classroom.enableAudio}
        </Button>
      )}
      <Toggle on={snap.micOn} label={snap.micOn ? t.classroom.micOff : t.classroom.micOn} onClick={room.toggleMic} />
      <Toggle on={snap.camOn} label={snap.camOn ? t.classroom.camOff : t.classroom.camOn} onClick={room.toggleCamera} />
      <Toggle on={snap.shareOn} label={snap.shareOn ? t.classroom.shareOff : t.classroom.shareOn} onClick={room.toggleShare} />
      <Button type="button" variant="danger" onClick={room.leave}>
        {t.classroom.leave}
      </Button>
    </div>
  );
}
