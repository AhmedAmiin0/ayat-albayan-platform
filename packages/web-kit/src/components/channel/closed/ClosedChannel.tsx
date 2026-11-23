import { closedReasonKey, closedSteps } from '@ab/client-core';
import type { ChannelClosedReason } from '@ab/shared';
import { t } from '#/lib/i18n/index.ts';
import { ClosedSteps } from './ClosedSteps';

const c = t.studentChannel;

interface Props {
  label: string;
  /** The heading above the card ('' = none). */
  name: string;
  /** ChannelPage.closed_reason; absent = before the subscription (closedReasonKey). */
  reason?: ChannelClosedReason | null | undefined;
}

/** The gold diamond over the card's title. */
function Diamond() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 justify-self-center text-gold">
      <path d="M10 2 18 10 10 18 2 10Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Before the subscription and the teacher's assignment (owner 2026-10-29), the card of what is
 * left (FamChatWebClosed / FamChatWebClosedTeacher): the title, who talks here, and the three
 * steps with the current one marked; the line of its reason stays as the card's status.
 */
export function ClosedChannel({ label, name, reason }: Props) {
  const key = closedReasonKey(reason);
  const steps = closedSteps(key);
  return (
    <section aria-label={label} className="grid gap-3">
      {name && <h2 className="font-display text-h3 font-bold">{name}</h2>}
      <div className="mx-auto grid w-full max-w-xl animate-fade-up gap-3 rounded-lg border border-rule bg-card p-5 text-center">
        <Diamond />
        <h3 className="font-display text-h3 font-bold text-balance">
          {steps.length > 0 ? c.closedCard.title : c.closedReasons[key]}
        </h3>
        <p role="status" className="sr-only">
          {c.closedReasons[key]}
        </p>
        {steps.length > 0 && <p className="text-sm text-ink-2">{c.closedCard.body}</p>}
        <ClosedSteps steps={steps} />
      </div>
    </section>
  );
}
