import type { TemplateView, WaLine } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { usePermissions } from '@/features/people/auth/use-permissions';
import { numbersQuery } from '@/features/messaging/numbers/numbers-api';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/form/button';
import { Toast } from '@/components/ui/overlay/toast';
import { t } from '@/lib/i18n/i18n';
import { otherLine, templatesQuery } from './api';
import { CreateTemplateDialog } from './create/CreateTemplateDialog';
import { CrmNameDialog } from './crm/CrmNameDialog';
import { MoveLineDialog } from './lines/MoveLineDialog';
import { SubmitTemplateDialog } from './numbers/SubmitTemplateDialog';
import { templateColumns } from './template-columns';
import { TemplateLines } from './lines/TemplateLines';
import { TemplateNumberDialog } from './numbers/TemplateNumberDialog';
import { useCrmName } from './crm/use-crm-name';
import { useCrmStatus } from './crm/use-crm-status';
import { useTemplateActions } from './use-template-actions';
import { useTemplateLines } from './lines/use-template-lines';
import { useTemplateNumber } from './numbers/use-template-number';

/**
 * Template health (R-MSG-01, issue C1): every registry row with Meta's status. Each number syncs
 * with its own WABA from its block (owner 2026-10-18); a not-submitted / rejected / missing row can
 * be sent to Meta for review from its own number (T3) and any row moved to the other number, each
 * only after its explicit confirm dialog. «متاح للمعلمين والمبيعات» (the restricted allow-list)
 * picks the only templates teachers, sales and other limited roles may send (owner 2026-10-12).
 * «يُرسل من» picks each template's own number (templates.manage, after its dialog; docs/23c decision 9).
 * A template on a crm line has its status and its CRM name set by hand (docs/19): the CRM holds it, nothing syncs it.
 * «قالب جديد» (owner 2026-10-31) adds a row; once saved, its «إرسال إلى ميتا» dialog opens.
 */
export function TemplateHealth({ headingId }: { headingId: string }) {
  const templates = useQuery(templatesQuery);
  const lines = useTemplateLines();
  const a = useTemplateActions();
  const { setSubmitting, setMoving, toggleStarter, savingStarter: saving } = a;
  const { phones, factsOf } = lines;
  const { can } = usePermissions();
  const manage = can('templates.manage');
  const numbers = useQuery({ ...numbersQuery, enabled: can('settings.read') }).data;
  const pick = useTemplateNumber(a.setNotice);
  const { setPicking, busy: pickBusy } = pick;
  const { busyKey: crmBusy, onSet: onCrmSet } = useCrmStatus(a.setNotice);
  const crmName = useCrmName(a.setNotice);
  const { setEditing: onEditName } = crmName;
  const columns = useMemo(
    () =>
      templateColumns({
        onSubmit: setSubmitting,
        onMove: setMoving,
        onStarter: (tpl, on) => toggleStarter({ key: tpl.key, on }),
        saving,
        phones,
        factsOf,
        sendFrom: { numbers, manage, busy: pickBusy, onPick: (template, numberId) => setPicking({ template, numberId }) },
        crmStatus: { busyKey: crmBusy, onSet: onCrmSet, onEditName },
      }),
    [setSubmitting, setMoving, toggleStarter, saving, phones, factsOf, numbers, manage, setPicking, pickBusy, crmBusy, onCrmSet, onEditName],
  );
  const rows = templates.data ?? [];
  const [creating, setCreating] = useState(false);
  const onCrm = (line: WaLine) => factsOf(line)?.provider === 'crm';
  const onCreated = (tpl: TemplateView) => {
    setCreating(false);
    a.setNotice({ message: t.templates.create.saved.replace('{name}', tpl.meta_name) });
    if (!onCrm(tpl.line)) setSubmitting(tpl);
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 id={headingId} className="font-display text-h4 font-bold">
          {t.templates.title}
        </h2>
        {manage && (
          <Button size="sm" className="ms-auto" onClick={() => setCreating(true)}>
            {t.templates.create.open}
          </Button>
        )}
      </div>
      <p className="mb-1 max-w-[70ch] text-sm text-ink-2">{t.templates.intro}</p>
      <p className="mb-3 max-w-[70ch] text-sm text-ink-2">{t.templates.salesStarterIntro}</p>
      <TemplateLines lines={lines} onNotice={a.setNotice} />
      {rows.some((r) => r.status !== 'approved') && (
        <p className="mb-3 border-s border-s-rule ps-3 text-xs font-semibold text-act">
          {t.templates.needsAttention}
        </p>
      )}
      {templates.isError && <p role="alert">{t.common.error}</p>}
      {templates.isPending ? (
        <p className="text-sm text-ink-3">{t.common.loading}</p>
      ) : (
        <DataTable columns={columns} data={rows} getRowId={(r) => r.key} stacked clientSort clientFilter emptyText={t.common.empty} />
      )}
      {a.submitting && (
        <SubmitTemplateDialog
          template={a.submitting}
          phone={phones[a.submitting.line]}
          facts={lines.factsOf(a.submitting.line)}
          busy={a.submit.isPending}
          onConfirm={() => a.submitting && a.submit.mutate(a.submitting.key)}
          onClose={() => setSubmitting(null)}
        />
      )}
      {a.moving && (
        <MoveLineDialog
          template={a.moving}
          target={factsOf(otherLine(a.moving.line))}
          busy={a.move.isPending}
          onConfirm={() => a.moving && a.move.mutate({ key: a.moving.key, line: otherLine(a.moving.line) })}
          onClose={() => setMoving(null)}
        />
      )}
      {pick.picking && (
        <TemplateNumberDialog
          pick={pick.picking}
          numbers={numbers}
          busy={pick.busy}
          onConfirm={pick.confirm}
          onClose={() => setPicking(null)}
        />
      )}
      {crmName.editing && (
        <CrmNameDialog template={crmName.editing} busy={crmName.save.isPending} onSave={(input) => crmName.save.mutate(input)} onClose={() => onEditName(null)} />
      )}
      {creating && <CreateTemplateDialog line="notifications" onCrm={onCrm} onCreated={onCreated} onClose={() => setCreating(false)} />}
      {a.notice && <Toast {...a.notice} onDismiss={() => a.setNotice(null)} />}
    </>
  );
}
