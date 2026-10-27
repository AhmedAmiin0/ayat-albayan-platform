import type { LineCheckView, Tone, WaLine } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { StatusChip, toneClass } from '@/components/ui/display/status-chip';
import { fullTime } from '@/features/messaging/inbox/format';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { LineDriver } from './LineDriver';
import { LineFacts } from './LineFacts';
import { webhookState, type WebhookState } from './line-status';
import { useClock } from '@/lib/clock';

type Shown = Exclude<WebhookState, 'unknown'>;
type Label = keyof typeof t.templates.settings.lines;
const WEBHOOK: Record<Shown, { tone: Tone; text: Label }> = {
  none: { tone: 'act', text: 'notSubscribed' },
  ours: { tone: 'ok', text: 'subscribed' },
  other: { tone: 'act', text: 'webhookOtherApp' },
  unverified: { tone: 'neutral', text: 'webhookUnverified' },
  kapso: { tone: 'neutral', text: 'webhookKapso' },
  kapsoNoSecret: { tone: 'act', text: 'webhookKapsoNoSecret' },
  crm: { tone: 'neutral', text: 'webhookCrm' },
  crmNoSecret: { tone: 'act', text: 'webhookCrmNoSecret' },
};
const GLYPH = { ok: 'fill', act: 'struck', bad: 'struck', neutral: 'half' } as const;
/** Long app names / override URLs wrap at phone width (no horizontal page scroll). */
const WRAP = 'whitespace-normal break-all';
const ERRORS: Record<string, string | undefined> = t.messages.errors;
const CREDENTIAL = { kapso: t.messages.errors.kapso_auth, crm: t.templates.error.crm_auth } as const;
/** A known Meta code in words, or Kapso / the CRM refusing its key in its own words (docs/19). */
const known = (e: LineCheckView['errors'][number]): string | undefined =>
  e.credential ? CREDENTIAL[e.credential] : e.code === null ? undefined : ERRORS[String(e.code)];

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
          <Ltr className={WRAP}>{[app.name, app.id].filter(Boolean).join(' · ')}</Ltr>
          {app.override_callback_uri && (
            <span className="block">
              {before}
              <Ltr className={WRAP}>{app.override_callback_uri}</Ltr>
              {after}
            </span>
          )}
        </p>
      ))}
    </div>
  );
}

/**
 * Each failed Graph call: «تعذّر الاستعلام: …» with a known Meta code (or kapso_auth) in words (messages.errors),
 * else Meta's message as data (dir auto); the code in an LTR island, Meta's raw text as the title.
 */
function CallErrors({ errors }: { errors: LineCheckView['errors'] }) {
  if (errors.length === 0) return null;
  const [before, after] = t.templates.settings.lines.callFailed.split('{message}');
  return (
    <ul className="grid gap-1 text-xs text-danger">
      {errors.map((e) => (
        <li key={e.step} className="flex items-start gap-1.5">
          <NuqtaGlyph shape="struck" className="mt-0.5" />
          <span title={e.message}>
            {before}
            <bdi dir="auto">{known(e) ?? e.message}</bdi>
            {after}
            {e.code !== null && <Ltr className="ms-1 text-2xs">({e.code})</Ltr>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * One WhatsApp line in «خطوط واتساب» (docs/12 §13.10): its name, and once checked whether the
 * server has it configured (an unconfigured notifications line is act: nothing can send; the chat
 * line is optional, said in a hint), Meta's facts, the webhook link, failed calls and when it was checked.
 */
export function LineRow({ line, view }: { line: WaLine; view: LineCheckView | null }) {
  const s = t.templates.settings.lines;
  const clock = useClock();
  return (
    <div data-testid="line-row" data-line={line} className="grid gap-2 border-t border-rule py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">{t.enums.waLine[line]}</p>
        {view &&
          (view.configured ? (
            <StatusChip size="sm" tone="ok" glyph="fill" label={s.configured} />
          ) : line === 'notifications' ? (
            <StatusChip size="sm" tone="act" glyph="struck" label={s.notConfigured} />
          ) : (
            <StatusChip size="sm" tone="neutral" glyph="hollow" label={s.notConfigured} />
          ))}
        {view && <span className="ms-auto text-2xs text-ink-3">{s.checkedAt.replace('{time}', fullTime(view.checked_at, clock))}</span>}
      </div>
      <LineDriver view={view} />
      {view && !view.configured && line === 'chat' && <p className="text-xs text-ink-3">{s.chatOptional}</p>}
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
