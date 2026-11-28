import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import type { SwatchProps } from './Swatch.types';
import { isPicked, pickPen, SWATCH } from './swatch.helpers';

export function Swatch({ color, board }: SwatchProps) {
  const picked = isPicked(board, color);
  return (
    <button
      type="button"
      aria-pressed={picked}
      aria-label={t.classroom.board.color.replace('{name}', t.classroom.board.colors[color])}
      onClick={() => pickPen(board, color)}
      className="grid size-11 place-items-center rounded-full sm:size-9"
    >
      <span
        className={cn(
          'size-6 rounded-full border-2 border-raised ring-1 ring-rule-strong',
          SWATCH[color],
          picked && 'ring-3 ring-lapis',
        )}
      />
    </button>
  );
}
