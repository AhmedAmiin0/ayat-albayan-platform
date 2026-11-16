import { channelBubbleActions } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { t } from '../../lib/i18n/i18n';
import { useNow } from '../../lib/time/use-now';
import { Button } from '../../ui/primitives/Button';
import type { ChannelRef } from '../channel-api';
import { ChannelDeleteStep } from './ChannelDeleteStep';
import { ChannelEditForm } from './ChannelEditForm';
import { channelChangeError, useChannelChange } from './use-channel-change';

type Step = 'menu' | 'edit' | 'delete';

interface StepProps {
  refs: ChannelRef;
  message: ChannelMessageView;
  change: ReturnType<typeof useChannelChange>;
  /** The API's refusal in words (a window that just passed), or null. */
  problem: string | null;
  now: Date;
  go: (step: Step) => void;
  onClose: () => void;
}

/** The menu's rows: only what channelBubbleActions allows now. */
const menuRows = ({ refs, message, now, go }: StepProps): ReactNode => {
  const may = channelBubbleActions({ audience: refs.audience, message, now });
  const a = t.studentChannel.actions;
  return (
    <>
      {may.edit ? <Button variant="secondary" label={a.edit} onPress={() => go('edit')} /> : null}
      {may.delete ? (
        <Button variant="secondary" label={a.deleteForAll} onPress={() => go('delete')} />
      ) : null}
    </>
  );
};

/** Each step's view: the rows, the edit form, the delete question (the admin's: moderation). */
const STEPS: Readonly<Record<Step, (p: StepProps) => ReactNode>> = {
  menu: menuRows,
  edit: (p) => (
    <ChannelEditForm
      initial={p.message.body}
      busy={p.change.edit.isPending}
      problem={p.problem}
      onSave={(body) => p.change.edit.mutate({ id: p.message.id, body }, { onSuccess: p.onClose })}
      onCancel={() => p.go('menu')}
    />
  ),
  delete: (p) => (
    <ChannelDeleteStep
      admin={p.refs.audience === 'admin'}
      busy={p.change.remove.isPending}
      problem={p.problem}
      onConfirm={() => p.change.remove.mutate(p.message.id, { onSuccess: p.onClose })}
      onCancel={() => p.go('menu')}
    />
  ),
};

interface ChannelMenuStepsProps {
  refs: ChannelRef;
  message: ChannelMessageView;
  onClose: () => void;
}

/**
 * The menu's rows, then the step a row opens: the edit form, or the delete confirm. The API's
 * refusal (a window that just passed) is said in words. `now` is the menu's opening minute.
 */
export function ChannelMenuSteps({ refs, message, onClose }: ChannelMenuStepsProps) {
  const [step, setStep] = useState<Step>('menu');
  const change = useChannelChange(refs);
  const now = useNow();
  const failed = change.edit.error ?? change.remove.error;
  const problem = failed ? channelChangeError(failed) : null;
  return STEPS[step]({ refs, message, change, problem, now, go: setStep, onClose });
}
