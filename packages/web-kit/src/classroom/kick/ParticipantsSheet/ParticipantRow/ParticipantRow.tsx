import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ParticipantRowProps } from './ParticipantRow.types';
import { K, M, ofName, shownName } from './participant-row.helpers';

export function ParticipantRow({ tile, kick, mute }: ParticipantRowProps) {
  return (
    <li className="flex min-h-11 flex-wrap items-center gap-2 border-b border-rule py-2 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{shownName(tile)}</span>
        {tile.role && <span className="text-xs text-ink-3">{t.classroom.roles[tile.role]}</span>}
      </span>
      {mute.canMute(tile, 'microphone') && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={ofName(M.micOf, tile)}
          onClick={() => mute.mute(tile, 'microphone')}
        >
          {M.mic}
        </Button>
      )}
      {mute.canMute(tile, 'camera') && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={ofName(M.camOf, tile)}
          onClick={() => mute.mute(tile, 'camera')}
        >
          {M.cam}
        </Button>
      )}
      {kick.canKick(tile) && (
        <Button
          type="button"
          variant="danger-quiet"
          size="sm"
          aria-label={ofName(K.actionOf, tile)}
          onClick={() => kick.ask(tile)}
        >
          {K.action}
        </Button>
      )}
    </li>
  );
}
