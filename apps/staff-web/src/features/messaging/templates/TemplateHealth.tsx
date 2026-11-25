import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { AuthorTemplate } from '@ab/client-core';
import type { TemplateView } from '@ab/shared';
import { usePermissions, Toast, t } from '@ab/web-kit';
import { numbersQuery } from '@/features/messaging/numbers/numbers-api';
import { DataTable } from '@/components/data-table/DataTable';
import { otherLine, templatesQuery } from './api';
import { NewTemplate } from './create/NewTemplate';
import { EditTemplateDialog } from './edit/EditTemplateDialog';
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

/** R-MSG-01: each number syncs with its own WABA; submit and move need an explicit confirm. */
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
  const [editing, setEditing] = useState<TemplateView | null>(null);
  const { setEditing: onEditName } = crmName;
  const columns = useMemo(
    () =>
      templateColumns({
        onSubmit: setSubmitting,
        onMove: setMoving,
        onEdit: setEditing,
        onStarter: (tpl, on) => toggleStarter({ key: tpl.key, on }),
        saving,
        phones,
        factsOf,
        sendFrom: { numbers, manage, busy: pickBusy, onPick: (template, numberId) => setPicking({ template, numberId }) },
        crmStatus: { busyKey: crmBusy, onSet: onCrmSet, onEditName },
      }),
    [setSubmitting, setMoving, setEditing, toggleStarter, saving, phones, factsOf, numbers, manage, setPicking, pickBusy, crmBusy, onCrmSet, onEditName],
  );
  const rows = templates.data ?? [];
  const onEdited = (saved: AuthorTemplate) => {
    setEditing(null);
    const text = saved.status === 'pending' ? t.templates.edit.saved : t.templates.edit.savedLocal;
    a.setNotice({ message: text.replace('{name}', saved.key) });
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 id={headingId} className="font-display text-h4 font-bold">
          {t.templates.title}
        </h2>
        <NewTemplate
          manage={manage}
          factsOf={factsOf}
          onNotice={a.setNotice}
          onSubmit={setSubmitting}
        />
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
      {editing && (
        <EditTemplateDialog tpl={editing} mode="admin" onSaved={onEdited} onClose={() => setEditing(null)} />
      )}
      {a.notice && <Toast {...a.notice} onDismiss={() => a.setNotice(null)} />}
    </>
  );
}
