import { IconButton } from '@/components/ui/form/icon-button';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import type { PickedInvitee } from './invitee-list';

interface Props {
  picked: readonly PickedInvitee[];
  onRemove: (key: string) => void;
}

/** The picked invitees as removable chips (a phone reads left to right). */
export function InviteeChips({ picked, onRemove }: Props) {
  if (picked.length === 0) return null;
  return (
    <ul aria-label={t.meetingInvites.invitees} className="flex flex-wrap gap-2">
      {picked.map((p) => (
        <li key={p.key} className="flex items-center gap-1 rounded-full border border-rule bg-sunk ps-3 text-sm">
          <span dir={p.input.kind === 'phone' ? 'ltr' : undefined}>{p.name}</span>
          <IconButton label={t.meetingInvites.removeInvitee.replace('{name}', p.name)} onClick={() => onRemove(p.key)}>
            <Icon name="x" />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
