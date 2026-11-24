import type { IntegrationKey } from '@ab/catalog';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Folded so the row itself stays in Arabic; a 44px target on phones (docs/23a §E H3). */
export function DeveloperKey({ name }: { name: IntegrationKey }) {
  const s = t.integrations;
  const [before, after = ''] = s.developerKey.split('{key}');
  return (
    <details className="text-2xs text-ink-3">
      <summary className="inline-flex min-h-11 cursor-pointer items-center sm:min-h-0">{s.developer}</summary>
      <p className="break-all">
        {before}
        <Ltr className="whitespace-normal">{name}</Ltr>
        {after}
      </p>
    </details>
  );
}
