import type { LineCheckView } from '@ab/shared';
import { Ltr } from '@/components/ui/ltr';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { lineTone, type LineField } from './line-status';

type Label = keyof typeof t.templates.settings.lines;

/** Glyph colour per tone; the shape carries the state (docs/07 §5), saffron only for act. */
const glyphClass = { ok: 'text-ok', act: 'text-act', bad: 'text-danger', neutral: 'text-ink-3' } as const;

type IdKey = 'phone_number_id' | 'waba_id' | 'display_phone_number';
const IDS: readonly (readonly [IdKey, Label])[] = [
  ['display_phone_number', 'displayPhone'],
  ['phone_number_id', 'phoneNumberId'],
  ['waba_id', 'wabaId'],
];
const FACTS: readonly (readonly [LineField, Label])[] = [
  ['status', 'status'],
  ['quality_rating', 'quality'],
  ['name_status', 'nameStatus'],
  ['code_verification_status', 'codeVerification'],
];

/** One raw Graph word (CONNECTED, GREEN, …): data, not UI copy, so English in an LTR island. */
function GraphWord({ field, value }: { field: LineField; value: string }) {
  const { tone, glyph } = lineTone(field, value);
  return (
    <span data-tone={tone} className={cn('inline-flex items-center gap-1.5', tone === 'act' && 'font-semibold text-act')}>
      <NuqtaGlyph shape={glyph} className={glyphClass[tone]} />
      <Ltr>{value}</Ltr>
    </span>
  );
}

/**
 * What Meta says about one configured line (docs/12 §13.10): the number and ids in LTR islands,
 * the verified name, then status / quality / name status / code verification with tone + glyph.
 * A field Meta did not answer is left out.
 */
export function LineFacts({ view }: { view: LineCheckView }) {
  const s = t.templates.settings.lines;
  const ids = IDS.filter(([key]) => view[key] !== null);
  const facts = FACTS.filter(([key]) => view[key] !== null);
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
      {ids.map(([key, label]) => (
        <div key={key} className="contents">
          <dt className="text-ink-3">{s[label]}</dt>
          <dd>
            <Ltr>{view[key]}</Ltr>
          </dd>
        </div>
      ))}
      {view.verified_name !== null && (
        <div className="contents">
          <dt className="text-ink-3">{s.verifiedName}</dt>
          <dd>
            <bdi dir="auto">{view.verified_name}</bdi>
          </dd>
        </div>
      )}
      {facts.map(([key, label]) => (
        <div key={key} className="contents">
          <dt className="text-ink-3">{s[label]}</dt>
          <dd>
            <GraphWord field={key} value={view[key] ?? ''} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
