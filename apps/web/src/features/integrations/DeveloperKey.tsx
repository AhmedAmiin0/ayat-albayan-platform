import type { IntegrationKey } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n';

/**
 * The server's key name, for developers only (docs/23a §E H3): folded under «للمطوّر», so the row
 * itself speaks Arabic. A 44px target on phones, like every summary on the site.
 */
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
