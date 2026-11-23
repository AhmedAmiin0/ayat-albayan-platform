import type { ChannelMessageView } from '@ab/shared';
import { Icon } from '#/components/ui/display/index.ts';
import { IconButton } from '#/components/ui/form/index.ts';
import { t } from '#/lib/i18n/index.ts';

const c = t.studentChannel;

interface Props {
  to: ChannelMessageView;
  onCancel: () => void;
}

/** Who wrote it: the name (mine too: «ردًّا على أنت» reads wrong), else the role's word. */
const writer = (m: ChannelMessageView): string => m.sender_name || c.roles[m.sender_role];

/**
 * «ردًّا على أ. فاطمة» above the composer (FamChatWebVoice, S7): the brand edge, the first words
 * or the file's kind, and ✕ «إلغاء الرد». It slides up into place (fade-up) when a reply starts.
 */
export function ReplyBar({ to, onCancel }: Props) {
  const words = to.body || c.kinds[to.kind];
  return (
    <div className="flex animate-fade-up items-center gap-2 rounded-md border border-rule bg-page py-1.5 ps-3 pe-1">
      <div className="grid min-w-0 flex-1 gap-0.5 border-s-[3px] border-lapis ps-2.5">
        <p className="text-xs font-bold text-lapis">
          {c.reply.replyingTo.replace('{name}', writer(to))}
        </p>
        <p className="truncate text-xs text-ink-2">{words}</p>
      </div>
      <IconButton label={c.reply.cancel} onClick={onCancel} className="ab-press rounded-full">
        <Icon name="x" />
      </IconButton>
    </div>
  );
}
