import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ContextHeader } from '@ab/web-kit/classroom/flow/ContextHeader';
import type { RoomContext } from '@ab/web-kit/classroom/flow/room-kit';
import type { RoomVariant } from '@ab/web-kit/classroom/flow/room-variant';
import { RoomIcon } from '@ab/web-kit/classroom/room/components/room-icons';
import { closingSpec, type ClosingKind } from './closing-kinds';

/** The page's own rejoin: under way, or refused (its words). */
export interface RejoinState {
  busy: boolean;
  note: string | null;
}

export interface RoomClosingProps {
  kind: ClosingKind;
  /** Staff keep their plain left screen (closing-kinds.ts). */
  variant: RoomVariant;
  /** A failed connect's own words. */
  failure: string | null;
  context: RoomContext | null;
  onRejoin?: (() => void) | undefined;
  /** Back to the page that opened the room, never a dead end. */
  onBack?: (() => void) | undefined;
  rejoin?: RejoinState | undefined;
}

interface ButtonsProps {
  again: (() => void) | undefined;
  onBack: (() => void) | undefined;
  busy: boolean;
}

/** Rejoin while it can work, over back, which leads when alone. */
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
