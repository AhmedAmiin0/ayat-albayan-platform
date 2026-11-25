import type { GateScreen } from '@ab/client-core';
import { useId } from 'react';
import { t } from '@ab/web-kit';
import { GateIcon, type GateIconName } from './GateIcon';

const G = t.shortLinks.gate;

/** The screens that end on a card saying why the link does not open. */
export type StatusKind = Extract<
  GateScreen,
  'full' | 'restricted' | 'expired' | 'revoked' | 'not_found'
>;
type Tone = 'act' | 'quiet';
type GateText = { [K in keyof typeof G]: (typeof G)[K] extends string ? K : never }[keyof typeof G];

interface Look {
  icon: GateIconName;
  tone: Tone;
  title: GateText;
  body: GateText;
}

// Boards LinkXGateFull / Restricted / Expired / Revoked / NotFound (+Dark).
const LOOKS: Readonly<Record<StatusKind, Look>> = {
  full: { icon: 'users', tone: 'act', title: 'fullTitle', body: 'fullBody' },
  restricted: { icon: 'lock', tone: 'quiet', title: 'restrictedTitle', body: 'restrictedBody' },
  expired: { icon: 'clock', tone: 'act', title: 'expiredTitle', body: 'expiredBody' },
  revoked: { icon: 'ban', tone: 'quiet', title: 'revokedTitle', body: 'revokedBody' },
  not_found: { icon: 'link-off', tone: 'quiet', title: 'notFoundTitle', body: 'notFoundBody' },
};

const TONES: Readonly<Record<Tone, string>> = {
  act: 'bg-act-soft text-act',
  quiet: 'bg-margin text-ink-2',
};

/** Why the link does not open: the tinted icon, the title and what to do. */
export function StatusCard({ kind }: { kind: StatusKind }) {
  const id = useId();
  const look = LOOKS[kind];
  return (
    <section
      aria-labelledby={id}
      className="flex items-start gap-3 rounded-[20px] border border-rule bg-raised p-4"
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${TONES[look.tone]}`}>
        <GateIcon name={look.icon} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <h2 id={id} className="text-base leading-[26px] font-bold text-ink">
          {G[look.title]}
        </h2>
        <p className="text-[14px] leading-[22px] text-pretty text-ink-2">{G[look.body]}</p>
      </span>
    </section>
  );
}
