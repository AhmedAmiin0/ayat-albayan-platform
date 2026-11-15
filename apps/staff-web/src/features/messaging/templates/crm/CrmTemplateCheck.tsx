import type { TemplateView, WaLine } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { templatesQuery } from '@/features/messaging/templates/api';
import { templateName } from '@/features/messaging/templates/template-cells';
import { t } from '@/lib/i18n/i18n';

const s = t.templates.crmCheck;

/** The number's missing templates, each with the words Meta's refusal came with, then the fix. */
function MissingList({ rows }: { rows: readonly TemplateView[] }) {
  return (
    <>
      <p className="font-semibold text-act">{s.missing.replace('{count}', String(rows.length))}</p>
      <ul className="grid gap-1">
        {rows.map((r) => (
          <li key={r.key}>
            {s.item.replace('{name}', templateName(r.key)).replace('{meta}', r.meta_name)}
            {r.last_error && (
              <span dir="auto" className="block text-2xs text-danger">
                {r.last_error}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-ink-2">{s.fix}</p>
    </>
  );
}

/**
 * «تحقق من القالب» on a crm number (docs/19, owner 2026-10-31). The CRM's API cannot list its
 * templates, so a send Meta refuses with #132001 marks the template missing (the API's
 * templates/check): this lists the number's missing ones and how to fix one. It reads the table's
 * copy of the registry (TemplateHealth loads it), never a request of its own.
 */
export function CrmTemplateCheck({ line }: { line: WaLine }) {
  const rows = useQuery({ ...templatesQuery, enabled: false }).data;
  const missing = rows?.filter((r) => r.line === line && r.status === 'missing');
  return (
    <div className="grid gap-1 border-s border-s-rule ps-3 text-xs" data-testid="crm-template-check">
      <h5 className="font-bold">{s.title}</h5>
      <p className="text-ink-2">{s.intro}</p>
      {missing?.length === 0 && <p className="text-ink-3">{s.none}</p>}
      {missing?.length ? <MissingList rows={missing} /> : null}
    </div>
  );
}
