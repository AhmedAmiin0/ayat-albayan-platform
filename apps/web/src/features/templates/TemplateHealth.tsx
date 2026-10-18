import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { otherLine, templatesQuery } from './api';
import { MoveLineDialog } from './MoveLineDialog';
import { SubmitTemplateDialog } from './SubmitTemplateDialog';
import { templateColumns } from './template-columns';
import { TemplateLines } from './TemplateLines';
import { useTemplateActions } from './use-template-actions';
import { useTemplateLines } from './use-template-lines';

/**
 * Template health (R-MSG-01, issue C1): every registry row with Meta's status. Each number syncs
 * with its own WABA from its block (owner 2026-10-18); a not-submitted / rejected / missing row can
 * be sent to Meta for review from its own number (T3) and any row moved to the other number, each
 * only after its explicit confirm dialog. «متاح للمعلمين والمبيعات» (the restricted allow-list)
 * picks the only templates teachers, sales and other limited roles may send (owner 2026-10-12).
 */
export function TemplateHealth({ headingId }: { headingId: string }) {
  const templates = useQuery(templatesQuery);
  const lines = useTemplateLines();
  const a = useTemplateActions();
  const { setSubmitting, setMoving, toggleStarter, savingStarter: saving } = a;
  const { phones, factsOf } = lines;
  const columns = useMemo(
    () =>
      templateColumns({
        onSubmit: setSubmitting,
        onMove: setMoving,
        onStarter: (tpl, on) => toggleStarter({ key: tpl.key, on }),
        saving,
        phones,
        factsOf,
      }),
    [setSubmitting, setMoving, toggleStarter, saving, phones, factsOf],
  );
  const rows = templates.data ?? [];

  return (
    <>
      <h2 id={headingId} className="mb-2 font-display text-h4 font-bold">
        {t.templates.title}
      </h2>
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
      {a.notice && <Toast {...a.notice} onDismiss={() => a.setNotice(null)} />}
    </>
  );
}
