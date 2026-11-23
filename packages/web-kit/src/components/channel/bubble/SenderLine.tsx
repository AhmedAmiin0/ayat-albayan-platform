import type { ChannelSenderLabel } from '@ab/shared';
import { t } from '#/lib/i18n/index.ts';

/** The name's colour by role (the phone's role-ink): the teacher green, the assistant amber. */
const INK: Readonly<Record<ChannelSenderLabel, string>> = {
  teacher: 'text-lapis',
  sales: 'text-act',
  guardian: 'text-ink-2',
  student: 'text-ink-2',
  unknown: 'text-ink-2',
};

interface Props {
  name: string;
  role: ChannelSenderLabel;
}

/** «أ. فاطمة · المعلم/ة» over someone else's first message of a run (the FamChat boards). */
export function SenderLine({ name, role }: Props) {
  const word = t.studentChannel.roles[role];
  return (
    <p className="text-2xs text-ink-3">
      {name && <span className={`font-bold ${INK[role]}`}>{name}</span>}
      {name ? ` · ${word}` : word}
    </p>
  );
}
