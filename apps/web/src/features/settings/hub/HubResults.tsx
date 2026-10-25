import { counted } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n';
import type { HubHit } from './hub-search';
import { HubLink } from './HubLink';

const H = t.settingsHub;

/**
 * The hub search's results (states.html#hub): one link per hit, to the group or tab that holds it,
 * with where it lives and, for a setting, its key in small LTR text. The count (or «لا توجد…»)
 * sits in a polite live region.
 */
export function HubResults({ hits }: { hits: readonly HubHit[] }) {
  return (
    <section aria-label={H.results} className="grid gap-2">
      <p role="status" className="text-sm text-ink-2">
        {hits.length === 0 ? t.config.search.none : counted(H.resultsCount, hits.length)}
      </p>
      {hits.length > 0 && (
        <ul className="grid">
          {hits.map((hit) => (
            <li key={hit.id} className="border-b border-rule last:border-0">
              <HubLink
                href={hit.href}
                className="grid min-h-11 gap-0.5 rounded-sm px-2 py-2 text-ink no-underline hover:bg-sunk"
              >
                <span className="font-semibold">{hit.label}</span>
                <small className="text-xs text-ink-3">
                  {hit.where}
                  {hit.settingKey && (
                    <>
                      {' · '}
                      <Ltr>{hit.settingKey}</Ltr>
                    </>
                  )}
                </small>
              </HubLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
