import { counted } from '@ab/core';
import { Ltr, t } from '@ab/web-kit';
import type { HubHit } from './hub-search';
import { HubLink } from './HubLink';

const H = t.settingsHub;

/** The count sits in a polite live region. */
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
