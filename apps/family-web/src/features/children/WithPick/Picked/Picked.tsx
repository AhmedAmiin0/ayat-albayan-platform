import { WAITING } from './picked.views';
import type { PickedProps } from './Picked.types';
import { usePicked } from './use-picked';

export function Picked({ home, page }: PickedProps) {
  const { pick } = usePicked();
  if (pick.state !== 'one') return <>{WAITING[pick.state](home)}</>;
  // A new pick starts the page afresh (its first tab) and fades in: the switch reads as a new
  // child's page, not a flicker of the old one (--duration-quick, opacity only).
  return (
    <div key={pick.student.id} className="grid animate-fade-in gap-5">
      {page(pick.student, home)}
    </div>
  );
}
