import { FormAlert, t } from '@ab/web-kit';
import { LinkCard } from '@/features/platform/short-links-gate/parts/LinkCard';
import type { Gate } from '@/features/platform/short-links-gate/use-gate';

const G = t.shortLinks.gate;

/** While the view loads (or why it could not be read): the hidden-title card and a status line. */
export function LoadingScreen({ gate }: { gate: Gate }) {
  return (
    <>
      <LinkCard title={null} />
      {gate.failed ? (
        <FormAlert>{G.errors.generic}</FormAlert>
      ) : (
        <p role="status" className="text-center text-sm text-ink-2">{t.common.loading}</p>
      )}
    </>
  );
}

/** Outcome open: the page is on its way to the target; a link in case the browser held it. */
export function OpeningScreen({ gate }: { gate: Gate }) {
  return (
    <>
      <LinkCard title={gate.title} />
      <p role="status" className="text-center text-sm text-ink-2">{G.opening}</p>
      {gate.target !== null && (
        <a
          href={gate.target}
          className="justify-self-center text-sm font-semibold text-lapis underline"
        >
          {G.openManually}
        </a>
      )}
    </>
  );
}
