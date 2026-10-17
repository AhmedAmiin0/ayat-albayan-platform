import type { LineCheckView } from '@ab/shared';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { optionText } from '../integrations/integrations-form';

/** Several key names in one LTR island must wrap at phone width (no horizontal page scroll). */
const WRAP = 'whitespace-normal break-all';

/**
 * The line's sending provider (docs/19: Meta directly or Kapso) and, when it cannot send yet, the
 * NAMES of the keys it still lacks (env names, so English in an LTR island; never values), and in
 * words when the chat line's phone id is the notifications one.
 */
export function LineDriver({ view }: { view: Pick<LineCheckView, 'provider' | 'gaps' | 'duplicate_chat_phone'> | null }) {
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
          <Ltr className={WRAP}>{view.gaps.join(', ')}</Ltr>
          {after}
        </p>
      )}
      {view.duplicate_chat_phone && <p className="text-act">{s.duplicateChatPhone}</p>}
    </div>
  );
}
