import type { ReactNode } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Card } from '@ab/web-kit/components/ui/surface/card';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { BrandLockup } from '@ab/web-kit/components/shell/BrandLockup';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import type { MaintenanceCover, MaintenanceScreenProps } from './MaintenanceScreen.types';

const S = t.maintenance;
const WORDS = { maintenance: S.planned, down: S.outage } as const;
const DOT = 'size-1.5 rounded-full bg-gold motion-safe:animate-pulse';
/** Planned: a calm green tile with a clock. Outage: a gold wash with three slow dots. */
const TILE: Record<MaintenanceCover, { tone: string; glyph: ReactNode }> = {
  maintenance: { tone: 'bg-lapis-wash text-lapis', glyph: <Icon name="clock" className="size-6" /> },
  down: {
    tone: 'bg-gold-wash',
    glyph: (
      <span className="flex gap-1">
        <span className={DOT} />
        <span className={cn(DOT, '[animation-delay:200ms]')} />
        <span className={cn(DOT, '[animation-delay:400ms]')} />
      </span>
    ),
  },
};

/**
 * «تحت الصيانة» (owner 2026-11-21) over the whole app, above the kit's top layer (calls, z-60):
 * the family sign-in's frame (the brand lockup, one card), the tile, the words (announced) and
 * one way to ask again now, then the other language. The app keeps running underneath, inert.
 */
export function MaintenanceScreen({ kind, checking, onRetry }: MaintenanceScreenProps) {
  const words = WORDS[kind];
  const tile = TILE[kind];
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-background text-foreground">
      <div className="grid min-h-dvh items-start justify-items-center px-4 py-10 sm:py-16">
        <div className="grid w-full max-w-[400px] gap-6">
          <BrandLockup />
          <Card className="grid justify-items-center gap-4 p-6 text-center">
            <span aria-hidden className={cn('grid size-11 place-items-center rounded-md', tile.tone)}>
              {tile.glyph}
            </span>
            <div role="status" className="grid gap-2">
              <h2 className="font-display text-h3 font-bold text-balance">{words.title}</h2>
              <p className="text-body text-pretty text-ink-2">{words.body}</p>
            </div>
            <Button size="lg" className="w-full" aria-busy={checking} onClick={onRetry}>
              {checking ? S.checking : S.retry}
            </Button>
          </Card>
          <LanguageSwitch className="justify-self-center" />
        </div>
      </div>
    </div>
  );
}
