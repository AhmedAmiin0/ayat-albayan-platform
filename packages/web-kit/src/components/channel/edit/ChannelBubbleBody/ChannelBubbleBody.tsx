import type { ChannelMessageView } from '@ab/shared';
import { QuoteBlock } from '@ab/web-kit/components/channel/bubble/QuoteBlock';
import { AttachmentBody } from '@ab/web-kit/components/channel/media/AttachmentBody';
import { LinkedBody } from '@ab/web-kit/components/ui/display/linked-body';
import { ChannelEditForm } from '@ab/web-kit/components/channel/edit/ChannelEditForm';
import type { useBubbleEditing } from '@ab/web-kit/components/channel/edit/use-bubble-editing';

interface Props {
  message: ChannelMessageView;
  tools: ReturnType<typeof useBubbleEditing>;
}

/** A deleted message is drawn by the bubble itself. */
export function ChannelBubbleBody({ message: m, tools }: Props) {
  return (
    <>
      {m.reply_to && <QuoteBlock reply={m.reply_to} />}
      <AttachmentBody message={m} />
      {tools.mode === 'edit' ? (
        <ChannelEditForm
          initial={m.body}
          pending={tools.pending}
          onSave={tools.save}
          onCancel={tools.close}
        />
      ) : (
        m.body && <LinkedBody text={m.body} />
      )}
      {tools.problem && (
        <p role="alert" className="text-2xs text-destructive">
          {tools.problem}
        </p>
      )}
    </>
  );
}
