import type { LineCheckView } from '@ab/shared';
import { isIntegrationKey } from '@ab/catalog';
import { Ltr, t } from '@ab/web-kit';
import { integrationText, optionText } from '@/features/platform/integrations/integrations-form';

/** An unknown key name stays an LTR island that wraps at phone width (no horizontal page scroll). */
const WRAP = 'whitespace-normal break-all';

/** A key outside the registry is shown as written (docs/23a §E H3). */
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

type ScopeView = Partial<
  Pick<LineCheckView, 'crm_send_scope' | 'crm_template_scopes_missing' | 'crm_read_scopes_missing'>
>;

interface ScopeNoteProps {
  text: string;
  lacking: readonly string[] | null | undefined;
}

function ScopeNote({ text, lacking }: ScopeNoteProps) {
  const [before, after = ''] = text.split('{scopes}');
  if (!lacking?.length) return null;
  return (
    <p className="text-act">
      {before}
      <Ltr className={WRAP}>{lacking.join(', ')}</Ltr>
      {after}
    </p>
  );
}
type DriverView = Pick<LineCheckView, 'provider' | 'gaps' | 'duplicate_chat_phone'> & ScopeView;

/** Unknown scopes (the call failed) show nothing (docs/39, docs/19). */
function CrmScopes({ view }: { view: ScopeView }) {
  const s = t.templates.settings.lines;
  return (
    <>
      {view.crm_send_scope === false && <p className="text-act">{s.crmScopeMissing}</p>}
      {view.crm_send_scope === true && <p className="text-ok">{s.crmScopeOk}</p>}
      <ScopeNote text={s.crmTemplateScopesMissing} lacking={view.crm_template_scopes_missing} />
      <ScopeNote text={s.crmReadScopesMissing} lacking={view.crm_read_scopes_missing} />
    </>
  );
}

/** Lacking keys are shown by label, never by value (docs/19). */
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
      {view.provider === 'crm' && <CrmScopes view={view} />}
    </div>
  );
}
