import type { ReactNode } from 'react';
import type { IconName } from '@ab/web-kit/components/ui/display/icon';
import { IconTile, type TileTone } from '@ab/web-kit/family/layout/IconTile';

interface Props {
  id: string;
  icon: IconName;
  tone?: TileTone;
  title: ReactNode;
  /** A short line under the title (a count, who wrote it). */
  line?: ReactNode;
}

/** A white card's heading (boards: report sections): the gradient icon tile, then the h2. */
export function CardHead({ id, icon, tone = 'green', title, line }: Props) {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={icon} tone={tone} />
      <div className="grid min-w-0 gap-0.5">
        <h2 id={id} className="text-[19px] font-extrabold leading-snug text-ink sm:text-[22px]">
          {title}
        </h2>
        {line && <p className="text-sm text-ink-3">{line}</p>}
      </div>
    </div>
  );
}
