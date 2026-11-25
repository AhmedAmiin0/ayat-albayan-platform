import type { TemplateLineSync, TemplateLineView } from '@ab/shared';
import type { WaLine } from '@ab/catalog';
import { Button, Ltr, useClock, t } from '@ab/web-kit';
import { fullTime } from '@/features/messaging/inbox/format';
import { optionText } from '@/features/platform/integrations/integrations-form';
import { CrmTemplateCheck } from '@/features/messaging/templates/crm/CrmTemplateCheck';
import { LineSyncResult } from '@/features/messaging/templates/lines/LineSyncResult';
import { useLineSync } from '@/features/messaging/templates/lines/use-line-sync';
import type { Notice } from '@/features/messaging/templates/use-template-actions';

export interface TemplateLineBlockProps {
  line: WaLine;
  /** The server's facts for this number; undefined while loading. */
  facts: TemplateLineView | undefined;
  /** The formatted phone from the last lines check, when one ran. */
  phone: string | undefined;
  onNotice: (notice: Notice) => void;
}

function NumberFacts({ facts, phone }: Pick<TemplateLineBlockProps, 'facts' | 'phone'>) {
  const p = t.templates.perNumber;
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
      <dt className="text-ink-3">{p.phone}</dt>
      <dd>{phone ? <Ltr>{phone}</Ltr> : <span className="text-ink-3">{t.templates.phoneUnknown}</span>}</dd>
      <dt className="text-ink-3">{p.wabaId}</dt>
      <dd>{facts?.waba_id ? <Ltr className="whitespace-normal break-all">{facts.waba_id}</Ltr> : '—'}</dd>
      <dt className="text-ink-3">{p.provider}</dt>
      <dd>{facts ? optionText(facts.provider) : '—'}</dd>
    </dl>
  );
}

/** A configured number: its facts and last sync; a crm one (docs/39) also notes the CRM. */
function LineBody({ line, facts, phone, shown, crm }: Pick<TemplateLineBlockProps, 'line' | 'facts' | 'phone'> & { shown: TemplateLineSync | null; crm: boolean }) {
  return (
    <>
      <NumberFacts facts={facts} phone={phone} />
      <LastSync at={shown?.checked_at} />
      {shown && <LineSyncResult sync={shown} />}
      {crm && (
        <>
          <p className="text-xs text-ink-2">{t.templates.perNumber.crmManaged}</p>
          <CrmTemplateCheck line={line} />
        </>
      )}
    </>
  );
}

function LastSync({ at }: { at: string | undefined }) {
  const p = t.templates.perNumber;
  const clock = useClock();
  return (
    <p className="text-xs text-ink-3">
      {at ? <time dateTime={at}>{p.lastSync.replace('{time}', fullTime(at, clock))}</time> : p.neverSynced}
    </p>
  );
}

/** The newer of two syncs by checked_at (a move's re-sync on the server beats an older session result). */
export function newerSync(
  a: TemplateLineSync | null,
  b: TemplateLineSync | null,
): TemplateLineSync | null {
  if (!a || !b) return a ?? b;
  return Date.parse(a.checked_at) >= Date.parse(b.checked_at) ? a : b;
}

/** A number without server credentials says so and offers no sync. */
export function TemplateLineBlock({ line, facts, phone, onNotice }: TemplateLineBlockProps) {
  const p = t.templates.perNumber;
  const { result, syncing, sync } = useLineSync({ line, onNotice });
  const shown = newerSync(result, facts?.last_sync ?? null);
  const name = t.enums.waLine[line];
  const off = facts?.configured === false;
  // A crm line (docs/39) syncs too: it reads the statuses the CRM synced from Meta.
  const crm = facts?.provider === 'crm';
  return (
    <section data-testid="template-line" data-line={line} aria-busy={syncing} className="grid min-w-0 content-start gap-2 rounded-md border border-rule p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 className="text-sm font-bold">{name}</h4>
        {!off && (
          <Button variant="secondary" size="sm" className="ms-auto" aria-label={(syncing ? p.syncingFor : p.syncFor).replace('{line}', name)} disabled={syncing} onClick={sync}>
            {syncing ? p.syncing : p.sync}
          </Button>
        )}
      </div>
      {off ? <p className="text-xs text-ink-3">{p.notConfigured}</p> : <LineBody line={line} facts={facts} phone={phone} shown={shown} crm={crm} />}
    </section>
  );
}
