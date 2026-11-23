import { Icon, Button, FormAlert } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { ContextHeader } from '#/classroom/flow/ContextHeader.tsx';
import type { RoomContext } from '#/classroom/flow/room-kit.ts';
import type { RoomVariant } from '#/classroom/flow/room-variant.ts';
import { RoomIcon } from '#/classroom/room/components/room-icons.tsx';
import { closingSpec, type ClosingKind } from './closing-kinds';

/** The page's own rejoin: under way, or refused (its words). */
export interface RejoinState {
  busy: boolean;
  note: string | null;
}

export interface RoomClosingProps {
  kind: ClosingKind;
  /** Staff keep their plain «خرجت من الحلقة» (closing-kinds.ts). */
  variant: RoomVariant;
  /** A failed connect's own words. */
  failure: string | null;
  context: RoomContext | null;
  onRejoin?: (() => void) | undefined;
  /** «رجوع» to the page that opened the room (never a dead end). */
  onBack?: (() => void) | undefined;
  rejoin?: RejoinState | undefined;
}

interface ButtonsProps {
  again: (() => void) | undefined;
  onBack: (() => void) | undefined;
  busy: boolean;
}

/** «ادخل مرة أخرى» (while it can work) over «رجوع», which leads when it is alone. */
function ClosingButtons({ again, onBack, busy }: ButtonsProps) {
  return (
    <div className="grid w-full gap-2.5">
      {again && (
        <Button type="button" size="lg" disabled={busy} onClick={again}>
          <RoomIcon name="cam" />
          {busy ? t.portal.joining : t.classroom.rejoin}
        </Button>
      )}
      {onBack && (
        <Button type="button" size="lg" variant={again ? 'secondary' : 'primary'} onClick={onBack}>
          {t.mobileRoom.back}
        </Button>
      )}
    </div>
  );
}

/** Why it ended, who is still inside (when it is known), and a refused rejoin's words. */
function ClosingText({ kind, variant, failure, context, rejoin }: RoomClosingProps) {
  const spec = closingSpec(kind, variant);
  return (
    <>
      <h1 role="status" className="text-xl font-bold">{failure ?? spec.title}</h1>
      {spec.body && <p className="text-sm text-ink-2">{spec.body}</p>}
      {spec.presence && context?.presence}
      {rejoin?.note && <FormAlert className="w-full text-start">{rejoin.note}</FormAlert>}
    </>
  );
}

/**
 * After the call (boards FamRoomWebLeft / FamRoomWebEnded): a calm icon, why it ended, who is
 * still inside when it is known, «ادخل مرة أخرى» where a rejoin can work, and «رجوع». It settles
 * in with fade-up.
 */
export function RoomClosing(props: RoomClosingProps) {
  const { kind, variant, context, onRejoin, onBack, rejoin } = props;
  const spec = closingSpec(kind, variant);
  const again = spec.rejoin ? onRejoin : undefined;
  const busy = rejoin?.busy ?? false;
  return (
    <main className="flex min-h-dvh flex-col bg-page">
      {context && <ContextHeader context={context} />}
      <div className="mx-auto grid w-full max-w-sm flex-1 animate-fade-up content-center justify-items-center gap-4 p-4 text-center">
        <span aria-hidden="true" className="grid size-18 place-items-center rounded-full bg-lapis-wash text-lapis">
          <Icon name={spec.icon} className="size-8" />
        </span>
        <ClosingText {...props} />
        <ClosingButtons again={again} onBack={onBack} busy={busy} />
      </div>
    </main>
  );
}
