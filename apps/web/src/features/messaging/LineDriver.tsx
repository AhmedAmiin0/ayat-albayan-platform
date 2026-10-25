import { isIntegrationKey, type LineCheckView } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n';
import { integrationText, optionText } from '../integrations/integrations-form';

/** An unknown key name stays an LTR island that wraps at phone width (no horizontal page scroll). */
const WRAP = 'whitespace-normal break-all';

/** What the line lacks, by the «التكاملات» label (docs/23a §E H3); a key outside the registry as written. */
function GapNames({ gaps }: { gaps: readonly string[] }) {
  const known = gaps.filter(isIntegrationKey).map((k) => integrationText(k).label);
  const other = gaps.filter((k) => !isIntegrationKey(k));
  return (
    <>
      {known.join(t.common.listSeparator)}
      {known.length > 0 && other.length > 0 && t.common.listSeparator}
      {other.length > 0 && <Ltr className={WRAP}>{other.join(', ')}</Ltr>}
    </>
  );
}

type DriverView = Pick<LineCheckView, 'provider' | 'gaps' | 'duplicate_chat_phone'> & Partial<Pick<LineCheckView, 'crm_send_scope'>>;

/**
 * The line's sending provider (docs/19: Meta directly, Kapso or the academy CRM) and, when it cannot send
 * yet, what it still lacks by its «التكاملات» label (never a value), in words when the chat line's phone id
 * is the notifications one, and on a crm line whether its key may send (GET /me; unknown = not shown).
 */
export function LineDriver({ view }: { view: DriverView | null }) {
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
          <GapNames gaps={view.gaps} />
          {after}
        </p>
      )}
      {view.duplicate_chat_phone && <p className="text-act">{s.duplicateChatPhone}</p>}
      {view.provider === 'crm' && view.crm_send_scope === false && <p className="text-act">{s.crmScopeMissing}</p>}
      {view.provider === 'crm' && view.crm_send_scope === true && <p className="text-ok">{s.crmScopeOk}</p>}
    </div>
  );
}
