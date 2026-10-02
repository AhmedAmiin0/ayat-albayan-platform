import { GRADES, type GradePoint } from '@ab/shared';
import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { t } from '@/lib/i18n';
import { chartPoints, segments, SERIES_KEYS, yOf, type SeriesKey } from './chart';
import { gradeWord, seriesLabel, shortDate } from './chart-labels';
import { ChartPoints } from './ChartPoints';

/**
 * «التقدم في التقييم» (R-REP-05, issue D2): one grade at a time (the overall grade, or a rubric
 * picked above the chart) over the student's reports. Single series → no legend; the selector
 * names it. Line + 8px dots in the action green on hairline grid rows labelled with the grade
 * words; every value also sits in the hidden table and the list below (tooltips never gate).
 */
export function GradeChart({ series, tz }: { series: readonly GradePoint[]; tz: string }) {
  const [key, setKey] = useState<SeriesKey>('overall');
  const points = chartPoints(series, key);
  const runs = segments(points);
  const lastGraded = [...points].reverse().find((p) => p.score !== null);
  const summary = t.reports.chart.summary
    .replace('{label}', seriesLabel(key))
    .replace('{grade}', gradeWord(lastGraded?.score ?? null))
    .replace('{n}', String(points.length));
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="grid gap-3">
      <SegmentedControl label={t.reports.chart.series} options={SERIES_KEYS.map((k) => ({ value: k, label: seriesLabel(k) }))} value={key} onChange={setKey} />
      <figcaption className="text-xs text-ink-2">{summary}</figcaption>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <div className="relative h-52 w-28 py-3" aria-hidden="true">
          {GRADES.map((g, i) => (
            <span key={g} className="absolute inset-x-0 -translate-y-1/2 text-2xs text-ink-3" style={{ top: `calc(12px + (100% - 24px) * ${yOf(5 - i) / 100})` }}>
              {t.enums.grade[g]}
            </span>
          ))}
        </div>
        <div className="relative h-52">
          <div className="absolute inset-x-3 inset-y-3">
            {GRADES.map((g, i) => (
              <div key={g} aria-hidden="true" className="absolute inset-x-0 h-px bg-rule" style={{ top: `${yOf(5 - i)}%` }} />
            ))}
            <svg aria-hidden="true" className="absolute inset-0 size-full overflow-visible rtl:-scale-x-100" viewBox="0 0 100 100" preserveAspectRatio="none">
              {runs.map((run) => (
                <polyline
                  key={run[0]?.id}
                  points={run.map((p) => `${p.pos},${p.y ?? 0}`).join(' ')}
                  fill="none"
                  stroke="var(--lapis)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            <ChartPoints points={points} tz={tz} />
          </div>
        </div>
      </div>
      {first && last && (
        <div className="flex justify-between ps-34 pe-3 text-2xs text-ink-3" aria-hidden="true">
          <span>{shortDate(first.at, tz)}</span>
          {last !== first && <span>{shortDate(last.at, tz)}</span>}
        </div>
      )}
      <table className="sr-only">
        <caption>{`${t.reports.chart.table}: ${seriesLabel(key)}`}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.id}>
              <th scope="row">{shortDate(p.at, tz)}</th>
              <td>{gradeWord(p.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
