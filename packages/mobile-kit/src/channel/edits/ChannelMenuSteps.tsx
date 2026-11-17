import type { ChannelMessageView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { t } from '../../lib/i18n/i18n';
import { Button } from '../../ui/primitives/Button';
import type { ChannelRef } from '../channel-api';
import { ChannelDeleteStep } from './ChannelDeleteStep';
import { ChannelEditForm } from './ChannelEditForm';
import type { MenuOffers } from './menu-offers';
import { channelChangeError, useChannelChange } from './use-channel-change';

type Step = 'menu' | 'edit' | 'delete';

/** The menu's ways out of itself: answer the message, see who read it, close. */
export interface MenuExits {
  onReply: (message: ChannelMessageView) => void;
  onReads: (message: ChannelMessageView) => void;
  onClose: () => void;
}

interface StepProps extends MenuExits {
  refs: ChannelRef;
  message: ChannelMessageView;
  offers: MenuOffers;
  change: ReturnType<typeof useChannelChange>;
  /** The API's refusal in words (a window that just passed), or null. */
  problem: string | null;
  go: (step: Step) => void;
}

/** Closes the menu, then does what the row says. */
const leave = (p: StepProps, exit: (m: ChannelMessageView) => void) => () => {
  p.onClose();
  exit(p.message);
};

/** The menu's rows (ChatXMenu): only what menuOffers allows now. */
const menuRows = (p: StepProps): ReactNode => {
  const a = t.studentChannel;
  const row = (on: boolean, label: string, onPress: () => void) =>
    on ? <Button variant="secondary" label={label} onPress={onPress} /> : null;
  return (
    <>
      {row(p.offers.reply, a.reply.action, leave(p, p.onReply))}
      {row(p.offers.reads, a.reads.action, leave(p, p.onReads))}
      {row(p.offers.edit, a.actions.edit, () => p.go('edit'))}
      {row(p.offers.delete, a.actions.deleteForAll, () => p.go('delete'))}
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

interface ChannelMenuStepsProps extends MenuExits {
  refs: ChannelRef;
  message: ChannelMessageView;
  offers: MenuOffers;
}

/**
 * The menu's rows, then the step a row opens: the edit form, or the delete confirm. The API's
 * refusal (a window that just passed, a read-only or closed chat) is said in words.
 */
export function ChannelMenuSteps(props: ChannelMenuStepsProps) {
  const [step, setStep] = useState<Step>('menu');
  const change = useChannelChange(props.refs);
  const failed = change.edit.error ?? change.remove.error;
  const problem = failed ? channelChangeError(failed) : null;
  return STEPS[step]({ ...props, change, problem, go: setStep });
}
