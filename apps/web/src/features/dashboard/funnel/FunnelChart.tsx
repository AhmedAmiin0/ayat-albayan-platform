import type { LeadStatus } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { Bar } from '../shared/Bar';
import { percent } from '../shared/format';
import { funnelSteps, type FunnelStage } from './funnel';

const stageLabel = (s: FunnelStage) => (s === 'new' ? t.dashboard.leadsInRange : t.enums.leadStatus[s]);

/**
 * R-RPT-01 funnel new → trial_booked → trial_done → converted. Ordered stages, one neutral hue;
 * each row says its count and the conversion from the stage before. The table is the data view.
 */
export function FunnelChart({ funnel }: { funnel: Record<LeadStatus, number> }) {
  const steps = funnelSteps(funnel);
  const max = steps[0]?.reached ?? 0;
  return (
    <figure className="grid grid-cols-1 gap-2">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t.dashboard.funnel}</caption>
        <thead>
          <tr className="border-b border-rule text-xs text-ink-3">
            <th scope="col" className="py-2 pe-3 text-start font-semibold">{t.dashboard.stage}</th>
            <th scope="col" className="py-2 pe-3 text-start font-semibold">{t.dashboard.leads}</th>
            <th scope="col" className="py-2 text-end font-semibold">{t.dashboard.conversion}</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => (
            <tr key={s.stage} className="border-b border-rule last:border-b-0">
              <th scope="row" className="py-2 pe-3 text-start font-semibold">{stageLabel(s.stage)}</th>
              <td className="w-1/2 py-2 pe-3">
                <span className="flex items-center gap-3">
                  <Bar value={s.reached} max={max} />
                  <span className="w-10 text-end font-semibold tabular-nums">{s.reached}</span>
                </span>
              </td>
              <td className="py-2 text-end tabular-nums text-ink-2">
                <bdi dir="ltr">{percent(s.rate)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="text-xs text-pretty text-ink-3">{t.dashboard.funnelHint}</figcaption>
    </figure>
  );
}
