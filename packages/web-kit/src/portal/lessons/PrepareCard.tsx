import { cardClass } from '@ab/web-kit/components/ui/surface/card';
import { prepareCard } from '@ab/client-core';
import type { PortalLessons } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** docs/50 §2: empty texts are left out, and nothing to prepare means no card. */
export function PrepareCard({ lessons }: { lessons: Pick<PortalLessons, 'prepare'> }) {
  const card = prepareCard(lessons);
  if (!card) return null;
  const lines: [string, string | null][] = [
    [t.portal.homework, card.homework],
    [t.portal.nextPlan, card.nextPlan],
  ];
  return (
    <section
      aria-label={t.portal.prepareTitle}
      className={`${cardClass} grid gap-2 p-4`}
    >
      <h3 className="font-display text-body font-bold">{t.portal.prepareTitle}</h3>
      <dl className="grid gap-2">
        {lines.map(([label, text]) =>
          text ? (
            <div key={label} className="grid gap-0.5">
              <dt className="text-xs text-ink-3">{label}</dt>
              <dd dir="auto" className="whitespace-pre-line text-sm text-ink">{text}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}
