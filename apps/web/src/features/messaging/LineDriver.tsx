import type { LineCheckView } from '@ab/shared';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { optionText } from '../integrations/integrations-form';

/**
 * The line's sending provider (docs/19: Meta directly or Kapso) and, when it cannot send yet, the
 * NAMES of the keys it still lacks (env names, so English in an LTR island; never values).
 */
export function LineDriver({ view }: { view: Pick<LineCheckView, 'provider' | 'gaps'> | null }) {
  const s = t.templates.settings.lines;
  if (!view) return null;
  const [before, after = ''] = s.gaps.split('{keys}');
  return (
    <div className="grid gap-1 text-xs">
      <p>
        <span className="text-ink-3">{s.provider}: </span>
        {optionText(view.provider)}
      </p>
      {view.gaps.length > 0 && (
        <p className="text-act">
          {before}
          <Ltr>{view.gaps.join(', ')}</Ltr>
          {after}
        </p>
      )}
    </div>
  );
}
