import type { TemplateLineSync, TemplateLineView, WaLine } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { fullTime } from '@/features/inbox/format';
import { t } from '@/lib/i18n';
import { optionText } from '../integrations/integrations-form';
import { LineSyncResult } from './LineSyncResult';
import { useLineSync } from './use-line-sync';
import type { Notice } from './use-template-actions';

export interface TemplateLineBlockProps {
  line: WaLine;
  /** The server's facts for this number; undefined while loading. */
  facts: TemplateLineView | undefined;
  /** The formatted phone from the last lines check, when one ran. */
  phone: string | undefined;
  onNotice: (notice: Notice) => void;
}

/** The number's phone (LTR, or «افحص الخطوط لعرض الرقم»), WABA id and driver. */
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

/** A configured number: its facts, then its last sync, or (crm, docs/19) that the CRM manages its templates. */
function LineBody({ facts, phone, shown, crm }: Pick<TemplateLineBlockProps, 'facts' | 'phone'> & { shown: TemplateLineSync | null; crm: boolean }) {
  return (
    <>
      <NumberFacts facts={facts} phone={phone} />
      {crm ? (
        <p className="text-xs text-ink-2">{t.templates.perNumber.crmManaged}</p>
      ) : (
        <>
          <LastSync at={shown?.checked_at} />
          {shown && <LineSyncResult sync={shown} />}
        </>
      )}
    </>
  );
}

/** «آخر مزامنة: …» or «لم تتم المزامنة بعد». */
function LastSync({ at }: { at: string | undefined }) {
  const p = t.templates.perNumber;
  return (
    <p className="text-xs text-ink-3">
      {at ? <time dateTime={at}>{p.lastSync.replace('{time}', fullTime(at))}</time> : p.neverSynced}
    </p>
  );
}

/** The newer of two syncs by checked_at (a move's re-sync on the server beats an older session result). */
export function newerSync(a: TemplateLineSync | null, b: TemplateLineSync | null): TemplateLineSync | null {
  if (!a || !b) return a ?? b;
  return Date.parse(a.checked_at) >= Date.parse(b.checked_at) ? a : b;
}

/**
 * One number of the template registry (owner 2026-10-18): its phone, WABA and driver, its own
 * «مزامنة مع Meta», and what its last sync found (the newer of this session's and the server's since boot).
 * A number the server has no credentials for says so and offers no sync.
 */
export function TemplateLineBlock({ line, facts, phone, onNotice }: TemplateLineBlockProps) {
  const p = t.templates.perNumber;
  const { result, syncing, sync } = useLineSync({ line, onNotice });
  const shown = newerSync(result, facts?.last_sync ?? null);
  const name = t.enums.waLine[line];
  const off = facts?.configured === false;
  // A crm line (docs/19): its templates live in the CRM, so it offers no sync with Meta.
  const crm = facts?.provider === 'crm';
  return (
    <section data-testid="template-line" data-line={line} aria-busy={syncing} className="grid min-w-0 content-start gap-2 rounded-md border border-rule p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 className="text-sm font-bold">{name}</h4>
        {!off && !crm && (
          <Button variant="secondary" size="sm" className="ms-auto" aria-label={(syncing ? p.syncingFor : p.syncFor).replace('{line}', name)} disabled={syncing} onClick={sync}>
            {syncing ? p.syncing : p.sync}
          </Button>
        )}
      </div>
      {off ? <p className="text-xs text-ink-3">{p.notConfigured}</p> : <LineBody facts={facts} phone={phone} shown={shown} crm={crm} />}
    </section>
  );
}
