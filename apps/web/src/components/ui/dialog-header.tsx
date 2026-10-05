import type { Glyph, Tone } from '@ab/shared';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Icon } from './icon';
import { IconButton } from './icon-button';
import { NuqtaGlyph } from './nuqta-glyph';
import { toneClass } from './status-chip';

export interface DialogHeaderProps {
  title: string;
  titleId: string;
  descId: string;
  onClose: () => void;
  description?: ReactNode;
  glyph?: { tone: Tone; shape: Glyph };
}

/**
 * The Dialog's title row: glyph tile, title, close button and description. On phones it is the
 * sheet's top bar (under the notch, a hairline below it); the body scrolls under it.
 */
export function DialogHeader({ title, titleId, descId, onClose, description, glyph }: DialogHeaderProps) {
  return (
    <div
      data-dialog-header
      className={cn(
        'grid shrink-0 items-start gap-x-3.5 gap-y-1',
        'max-sm:border-b max-sm:border-rule max-sm:bg-card max-sm:px-4 max-sm:pt-[max(1rem,env(safe-area-inset-top))] max-sm:pb-3',
        // Phones: the glyph tile shares the first row with the close button, the title gets
        // the full width under them (docs/07 §6 Dialog, phone crop).
        'grid-cols-[minmax(0,1fr)_auto]',
        glyph && 'sm:grid-cols-[auto_minmax(0,1fr)_auto]',
      )}
    >
      {glyph && (
        <span
          className={cn(
            'mt-1.5 grid size-10 place-items-center rounded-full max-sm:col-start-1 max-sm:row-start-1',
            toneClass[glyph.tone],
          )}
        >
          <NuqtaGlyph shape={glyph.shape} className="size-[18px]" />
        </span>
      )}
      <h2
        id={titleId}
        className={cn(
          'font-display text-[22px] font-bold leading-normal sm:text-[27px]',
          glyph && 'max-sm:col-span-full max-sm:row-start-2',
        )}
      >
        {title}
      </h2>
      <IconButton
        label={t.common.close}
        data-dialog-close
        onClick={onClose}
        className={cn('mt-0.5', glyph && 'max-sm:col-start-2 max-sm:row-start-1 max-sm:justify-self-end')}
      >
        <Icon name="x" />
      </IconButton>
      {description && (
        <div id={descId} className={cn('col-span-full text-body text-ink-2', glyph && 'sm:col-start-2')}>
          {description}
        </div>
      )}
    </div>
  );
}
