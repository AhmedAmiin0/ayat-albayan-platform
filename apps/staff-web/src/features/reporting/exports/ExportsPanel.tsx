import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { currentMonth } from '@/features/finance/payouts/api';
import { MonthSelect } from '@/features/finance/payouts/shared/MonthSelect';
import { dayMonthLabel } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { downloadCsv, exportErrorCode, type ExportKind, type ExportRequest } from './api';

export interface ExportsPanelProps {
  /** The dashboard period (Riyadh days): lessons and payments export this range. */
  period: { from: string; to: string };
  /** Payouts month to start from, "YYYY-MM". */
  month: string;
}

const errors: Readonly<Record<string, string>> = t.exports.error;

/** R-RPT-03: students, lessons, payments and payouts as CSV (UTF-8 with BOM: Arabic in Excel). */
export function ExportsPanel({ period, month: initialMonth }: ExportsPanelProps) {
  const [month, setMonth] = useState(initialMonth);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const span = t.dashboard.weekOf.replace('{from}', dayMonthLabel(period.from)).replace('{to}', dayMonthLabel(period.to));
  const run = async (req: ExportRequest) => {
    setBusy(req.kind);
    setError(null);
    try {
      await downloadCsv(req);
    } catch (e) {
      setError(errors[exportErrorCode(e) ?? ''] ?? t.exports.failed);
    } finally {
      setBusy(null);
    }
  };
  const button = (req: ExportRequest, label: string) => (
    <Button variant="secondary" size="sm" disabled={busy !== null} aria-label={`${t.exports.download}: ${label}`} onClick={() => void run(req)}>
      {busy === req.kind ? t.exports.preparing : t.exports.download}
    </Button>
  );
  const ranged = [
    { kind: 'lessons' as const, label: t.exports.lessons },
    { kind: 'payments' as const, label: t.exports.payments },
  ];
  const row = 'flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule py-2.5 last:border-b-0';
  return (
    <section aria-labelledby="dash-exports" className="grid gap-1">
      <h2 id="dash-exports" className="font-display text-h4 font-bold text-ink">
        {t.exports.title}
      </h2>
      <p className="text-xs text-pretty text-ink-3">{t.exports.hint}</p>
      <ul>
        <li className={row}>
          <span className="min-w-28 font-semibold">{t.exports.students}</span>
          <span className="text-xs text-ink-2">{t.exports.allStudents}</span>
          <span className="ms-auto">{button({ kind: 'students' }, t.exports.students)}</span>
        </li>
        {ranged.map((r) => (
          <li key={r.kind} className={row}>
            <span className="min-w-28 font-semibold">{r.label}</span>
            <span className="text-xs text-ink-2">{span}</span>
            <span className="ms-auto">{button({ kind: r.kind, params: period }, r.label)}</span>
          </li>
        ))}
        <li className={row}>
          <span className="min-w-28 font-semibold">{t.exports.payouts}</span>
          {/* «أكتوبر 2026» like the payouts page; a native month input shows the OS locale. */}
          <MonthSelect label={t.exports.month} value={month} latest={currentMonth()} onChange={setMonth} />
          <span className="ms-auto">{button({ kind: 'payouts', params: { month } }, t.exports.payouts)}</span>
        </li>
      </ul>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
