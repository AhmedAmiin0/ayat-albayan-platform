import type { LineCheckView, Tone, WaLine } from '@ab/shared';
import { Ltr } from '@/components/ui/ltr';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { StatusChip, toneClass } from '@/components/ui/status-chip';
import { fullTime } from '@/features/inbox/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { LineFacts } from './LineFacts';
import { webhookState, type WebhookState } from './line-status';

type Shown = Exclude<WebhookState, 'unknown'>;
type Label = keyof typeof t.templates.settings.lines;
const WEBHOOK: Record<Shown, { tone: Tone; text: Label }> = {
  none: { tone: 'act', text: 'notSubscribed' },
  ours: { tone: 'ok', text: 'subscribed' },
  other: { tone: 'act', text: 'webhookOtherApp' },
  unverified: { tone: 'neutral', text: 'webhookUnverified' },
};
const GLYPH = { ok: 'fill', act: 'struck', bad: 'struck', neutral: 'half' } as const;

/** Do inbound messages reach us: one chip (wrapping, it is a sentence), then each subscribed app. */
function Webhook({ view }: { view: LineCheckView }) {
  const s = t.templates.settings.lines;
  const state = webhookState(view);
  if (state === 'unknown') return null;
  const { tone, text } = WEBHOOK[state];
  const [before, after] = s.callbackOverride.split('{url}');
  return (
    <div className="grid gap-1 text-xs">
      <p className="text-ink-3">{s.webhook}</p>
      <p data-tone={tone} className={cn('flex items-start gap-1.5 rounded-md border px-2 py-1 font-semibold', toneClass[tone])}>
        <NuqtaGlyph shape={GLYPH[tone]} className="mt-0.5" />
        <span>{s[text]}</span>
      </p>
      {(view.subscribed_apps ?? []).map((app, i) => (
        <p key={app.id ?? i} className="text-ink-2">
          <Ltr>{[app.name, app.id].filter(Boolean).join(' · ')}</Ltr>
          {app.override_callback_uri && (
            <span className="block">
              {before}
              <Ltr>{app.override_callback_uri}</Ltr>
              {after}
            </span>
          )}
        </p>
      ))}
    </div>
  );
}

/** Each failed Graph call: «تعذّر الاستعلام: …» with Meta's message as data (dir auto). */
function CallErrors({ errors }: { errors: LineCheckView['errors'] }) {
  if (errors.length === 0) return null;
  const [before, after] = t.templates.settings.lines.callFailed.split('{message}');
  return (
    <ul className="grid gap-1 text-xs text-danger">
      {errors.map((e) => (
        <li key={e.step} className="flex items-start gap-1.5">
          <NuqtaGlyph shape="struck" className="mt-0.5" />
          <span>
            {before}
            <bdi dir="auto">{e.message}</bdi>
            {after}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * One WhatsApp line in «خطوط واتساب» (docs/12 §13.10): its name, and once checked whether the
 * server has it configured, Meta's facts, the webhook link, failed calls and when it was checked.
 */
export function LineRow({ line, view }: { line: WaLine; view: LineCheckView | null }) {
  const s = t.templates.settings.lines;
  return (
    <div data-testid="line-row" data-line={line} className="grid gap-2 border-t border-rule py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">{t.enums.waLine[line]}</p>
        {view &&
          (view.configured ? (
            <StatusChip size="sm" tone="ok" glyph="fill" label={s.configured} />
          ) : (
            <StatusChip size="sm" tone="neutral" glyph="hollow" label={s.notConfigured} />
          ))}
        {view && <span className="ms-auto text-2xs text-ink-3">{s.checkedAt.replace('{time}', fullTime(view.checked_at))}</span>}
      </div>
      {view?.configured && (
        <>
          <LineFacts view={view} />
          <Webhook view={view} />
          <CallErrors errors={view.errors} />
        </>
      )}
    </div>
  );
}
