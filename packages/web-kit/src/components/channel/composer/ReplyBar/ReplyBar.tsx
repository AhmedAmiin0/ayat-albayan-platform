import type { ChannelMessageView } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { IconButton } from '@ab/web-kit/components/ui/form/IconButton';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const c = t.studentChannel;

interface Props {
  to: ChannelMessageView;
  onCancel: () => void;
}

/** Mine uses my name too, since replying to "you" reads wrong. */
const writer = (m: ChannelMessageView): string => m.sender_name || c.roles[m.sender_role];

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
