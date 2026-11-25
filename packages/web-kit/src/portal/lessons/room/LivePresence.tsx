import { liveRoomText, type LiveRoom } from '@ab/client-core';
import { Avatar } from '@ab/web-kit/components/ui/display/avatar';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Up to three overlapping faces, as on the app's live card. */
const FACES = 3;

/** Staff appear by their role word only. */
export function LivePresence({ live }: { live: LiveRoom }) {
  const text = liveRoomText(live, t.portal.app.live);
  return (
    <div className="flex items-center gap-3 rounded-md border border-rule bg-sunk px-3 py-2.5 text-start">
      <span aria-hidden="true" className="flex shrink-0 -space-x-2 rtl:space-x-reverse">
        {text.faces.slice(0, FACES).map((name, i) => (
          <Avatar key={`${name}-${i}`} name={name} size="sm" decorative className="ring-2 ring-sunk" />
        ))}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{text.title}</span>
        <span className="block truncate text-xs text-ink-2">{text.who}</span>
      </span>
    </div>
  );
}
