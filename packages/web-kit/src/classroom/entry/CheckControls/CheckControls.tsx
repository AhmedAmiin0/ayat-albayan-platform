import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoomButton } from '@ab/web-kit/classroom/room/components/RoomButton';
import type { DeviceCheckController, DeviceControl } from '@ab/web-kit/classroom/entry/use-device-check';

const C = t.roomFlow.check;

/** The picked device, else the one the browser opened. */
const currentId = (c: DeviceControl): string =>
  c.id ?? (c.state.status === 'on' ? (c.state.track.getSettings().deviceId ?? '') : '');

/** Device lists show only when there is more than one to choose from. */
function Picker({ control, label }: { control: DeviceControl; label: string }) {
  const devices = control.state.status === 'on' ? control.state.devices : [];
  if (devices.length < 2) return null;
  return (
    <label className="grid min-w-0 flex-1 gap-1 text-xs text-ink-2">
      {label}
      <select
        value={currentId(control)}
        onChange={(e) => control.choose(e.target.value)}
        className="min-h-11 w-full rounded-md border border-rule-input bg-card px-2 text-sm text-ink"
      >
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Under the preview: the microphone and camera switches (the room's own buttons, round with their
 * words on phones), then the device lists when there is a choice.
 */
export function CheckControls({ check }: { check: DeviceCheckController }) {
  const { mic, cam } = check;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-center gap-3">
        <RoomButton
          icon="mic"
          on={mic.on}
          round
          short={t.mobileRoom.controls.mute}
          label={mic.on ? t.classroom.micOff : t.classroom.micOn}
          onClick={mic.toggle}
        />
        <RoomButton
          icon="cam"
          on={cam.on}
          round
          short={t.mobileRoom.controls.camera}
          label={cam.on ? t.classroom.camOff : t.classroom.camOn}
          onClick={cam.toggle}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Picker control={mic} label={C.micPick} />
        <Picker control={cam} label={C.camPick} />
      </div>
    </div>
  );
}
