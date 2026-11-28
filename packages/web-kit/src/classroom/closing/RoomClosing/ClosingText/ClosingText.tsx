import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { closingSpec } from '@ab/web-kit/classroom/closing/closing-kinds';
import type { RoomClosingProps } from '@ab/web-kit/classroom/closing/RoomClosing/RoomClosing.types';

/** Why it ended, who is still inside (when it is known), and a refused rejoin's words. */
export function ClosingText({ kind, variant, failure, context, rejoin }: RoomClosingProps) {
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
