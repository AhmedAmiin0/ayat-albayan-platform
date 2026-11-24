import type { ChannelMessageView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { t } from '../../lib/i18n/i18n';
import { View } from 'react-native';
import { ReplyIcon } from '../../chat-ui/icons/chat-glyphs';
import type { ChannelRef } from '../channel-api';
import { ChannelDeleteStep } from './ChannelDeleteStep';
import { ChannelEditForm } from './ChannelEditForm';
import { EditIcon, InfoIcon, TrashIcon } from './menu-icons';
import type { MenuOffers } from '@ab/client-core';
import { MenuRow } from './MenuRow';
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

/** Only what menuOffers allows now; a tap outside closes it, so there is no cancel row. */
const menuRows = (p: StepProps): ReactNode => {
  const a = t.studentChannel;
  const { reply, edit, reads } = p.offers;
  return (
    <View style={{ marginHorizontal: -16 }}>
      {reply ? (
        <MenuRow label={a.reply.action} Icon={ReplyIcon} onPress={leave(p, p.onReply)} />
      ) : null}
      {edit ? (
        <MenuRow label={a.actions.edit} Icon={EditIcon} onPress={() => p.go('edit')} />
      ) : null}
      {p.offers.delete ? (
        <MenuRow
          danger
          label={a.actions.deleteForAll}
          Icon={TrashIcon}
          onPress={() => p.go('delete')}
        />
      ) : null}
      {reads ? (
        <MenuRow label={a.reads.action} Icon={InfoIcon} onPress={leave(p, p.onReads)} />
      ) : null}
    </View>
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
