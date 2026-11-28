import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { ContextHeader } from '@ab/web-kit/classroom/flow/ContextHeader';
import { ClosingButtons } from './ClosingButtons';
import { ClosingText } from './ClosingText';
import type { RoomClosingProps } from './RoomClosing.types';
import { closingView } from './room-closing.helpers';

export function RoomClosing(props: RoomClosingProps) {
  const { icon, again, busy } = closingView(props);
  return (
    <main className="flex min-h-dvh flex-col bg-page">
      {props.context && <ContextHeader context={props.context} />}
      <div className="mx-auto grid w-full max-w-sm flex-1 animate-fade-up content-center justify-items-center gap-4 p-4 text-center">
        <span aria-hidden="true" className="grid size-18 place-items-center rounded-full bg-lapis-wash text-lapis">
          <Icon name={icon} className="size-8" />
        </span>
        <ClosingText {...props} />
        <ClosingButtons again={again} onBack={props.onBack} busy={busy} />
      </div>
    </main>
  );
}
