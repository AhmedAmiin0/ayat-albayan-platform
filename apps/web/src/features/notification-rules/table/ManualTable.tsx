import type { NotificationEntryView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { approvalWord, channelWords } from '../rule-text';

const r = t.notificationRules;
const c = t.notificationCatalogue;
const head = 'border-b border-rule-strong px-2 py-1.5 text-start text-xs font-semibold text-ink-3';
const cell = 'border-b border-rule px-2 py-2.5 text-start align-top text-xs text-ink-2';

/**
 * «يدوي»: the messages a person sends (listed, never switched), each with where it is sent from;
 * the channel and template status from 640px. The caption says once why there is no switch.
 */
export function ManualTable({ rows, caption }: { rows: readonly NotificationEntryView[]; caption: string }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs text-ink-2">{r.manualIntro}</p>
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={head}>
              {c.columns.name}
            </th>
            <th scope="col" className={head}>
              {r.columns.manualFrom}
            </th>
            <th scope="col" className={`${head} max-sm:hidden`}>
              {r.columns.channels}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.key} data-key={entry.key}>
              <th scope="row" className={`${cell} text-sm font-semibold text-ink`}>
                {c.entries[entry.key].name}
              </th>
              <td className={cell}>{c.entries[entry.key].trigger}</td>
              <td className={`${cell} max-sm:hidden`}>
                {channelWords(entry.channels)} · {approvalWord(entry).word}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
