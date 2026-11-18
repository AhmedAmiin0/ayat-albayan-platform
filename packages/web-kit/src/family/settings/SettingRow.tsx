import type { ReactNode } from 'react';
import type { IconName } from '@ab/web-kit/components/ui/display/icon';
import { IconTile, type TileTone } from '@ab/web-kit/family/layout/IconTile';

interface Props {
  icon: IconName;
  tone: TileTone;
  title: string;
  /** Names the row's control (aria-labelledby) when it has no label of its own. */
  titleId?: string;
  /** Lines under the title (what it does, its state). */
  hint?: ReactNode;
  /** The row's control at the end (a switch, segments). */
  control?: ReactNode;
}

/** A settings row (boards: «الإعدادات»): gradient tile, title and lines, control at the end. */
export function SettingRow({ icon, tone, title, titleId, hint, control }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 py-4">
      <IconTile icon={icon} tone={tone} />
      <div className="grid min-w-0 flex-1 basis-40 gap-1">
        <p id={titleId} className="text-[15px] font-bold text-ink">{title}</p>
        {hint}
      </div>
      {control && <div className="ms-auto shrink-0">{control}</div>}
    </div>
  );
}
