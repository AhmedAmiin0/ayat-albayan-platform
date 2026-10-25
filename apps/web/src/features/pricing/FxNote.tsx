import { FX_ATTRIBUTION_URL } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { FxRate } from './api';
import { fxLine } from './format';

/**
 * Under a USD price (docs/08 §4): the rate's date and the attribution the open API requires; a
 * notice (hollow glyph, ink-2) when the rate is an older stored one or the 3.75 peg.
 */
export function FxNote({ fx }: { fx: FxRate }) {
  const notice = fx.fallback || fx.ageHours !== null;
  return (
    <p className={cn('flex items-start gap-2 text-xs', notice ? 'text-ink-2' : 'text-ink-3')}>
      {notice && <NuqtaGlyph shape="hollow" className="mt-1" />}
      <span>
        {fxLine(fx)}
        {!fx.fallback && (
          <>
            {' · '}
            <a
              href={FX_ATTRIBUTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lapis underline underline-offset-2"
            >
              {t.pricing.fx.attribution}
            </a>
          </>
        )}
      </span>
    </p>
  );
}
