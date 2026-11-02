import { channelBubbleActions } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import type { ChannelRef } from '@/student-file/channel/channel-queries';
import { type, useTheme } from '@/theme';
import { channelChangeError, useChannelChange } from './use-channel-change';
import { ChannelEditForm } from './ChannelEditForm';

interface ChannelMenuStepsProps {
  refs: ChannelRef;
  message: ChannelMessageView;
  onClose: () => void;
}

/**
 * The menu's rows, then the step a row opens: the edit form, or the delete confirm (the admin's
 * says it is moderation). The API's refusal (a window that just passed) is said in words.
 */
export function ChannelMenuSteps({ refs, message: m, onClose }: ChannelMenuStepsProps) {
  const { color } = useTheme();
  const [step, setStep] = useState<'menu' | 'edit' | 'delete'>('menu');
  const { edit, remove } = useChannelChange(refs);
  const a = t.studentChannel.actions;
  const failed = edit.error ?? remove.error;
  const problem = failed ? channelChangeError(failed) : null;
  if (step === 'edit') {
    return (
      <ChannelEditForm
        initial={m.body}
        busy={edit.isPending}
        problem={problem}
        onSave={(text) => edit.mutate({ id: m.id, body: text }, { onSuccess: onClose })}
        onCancel={() => setStep('menu')}
      />
    );
  }
  if (step === 'delete') {
    const body = refs.audience === 'admin' ? a.moderateBody : a.deleteBody;
    return (
      <>
        <InlineConfirm
          message={`${a.deleteTitle} ${body}`}
          confirmLabel={a.deleteConfirm}
          tone="danger"
          busy={remove.isPending}
          onConfirm={() => remove.mutate(m.id, { onSuccess: onClose })}
          onCancel={() => setStep('menu')}
        />
        {problem ? (
          <AppText accessibilityRole="alert" style={{ color: color.bad, fontSize: type.size.xs }}>
            {problem}
          </AppText>
        ) : null}
      </>
    );
  }
  const may = channelBubbleActions({ audience: refs.audience, message: m, now: new Date() });
  return (
    <>
      {may.edit ? (
        <Button variant="secondary" label={a.edit} onPress={() => setStep('edit')} />
      ) : null}
      {may.delete ? (
        <Button variant="secondary" label={a.deleteForAll} onPress={() => setStep('delete')} />
      ) : null}
    </>
  );
}
