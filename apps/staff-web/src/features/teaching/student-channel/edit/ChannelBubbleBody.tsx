import type { ChannelMessageView } from '@ab/shared';
import { LinkedBody } from '@/components/ui/display/linked-body';
import { t } from '@/lib/i18n/i18n';
import { ChannelEditForm } from './ChannelEditForm';
import type { useBubbleEditing } from './use-bubble-editing';

interface Props {
  message: ChannelMessageView;
  tools: ReturnType<typeof useBubbleEditing>;
}

/**
 * The text with its links, the edit box while «تعديل» is open, or «تم حذف هذه الرسالة» (no text).
 */
export function ChannelBubbleBody({ message: m, tools }: Props) {
  if (m.deleted) return <p className="italic text-ink-3">{t.studentChannel.actions.deleted}</p>;
  return (
    <>
      {tools.mode === 'edit' ? (
        <ChannelEditForm
          initial={m.body}
          pending={tools.pending}
          onSave={tools.save}
          onCancel={tools.close}
        />
      ) : (
        <LinkedBody text={m.body} />
      )}
      {tools.problem && (
        <p role="alert" className="text-2xs text-destructive">
          {tools.problem}
        </p>
      )}
    </>
  );
}
