import type { ChannelMessageView } from '@ab/shared';
import { QuoteBlock } from '#/components/channel/bubble/QuoteBlock.tsx';
import { AttachmentBody } from '#/components/channel/media/AttachmentBody.tsx';
import { LinkedBody } from '#/components/ui/display/index.ts';
import { ChannelEditForm } from './ChannelEditForm';
import type { useBubbleEditing } from './use-bubble-editing';

interface Props {
  message: ChannelMessageView;
  tools: ReturnType<typeof useBubbleEditing>;
}

/**
 * The quote it answers, its photo, PDF or voice note, then the text with its links (a file's
 * caption), or the edit box while «تعديل» is open; the API's refusal under it. A deleted message
 * is drawn by the bubble itself.
 */
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
