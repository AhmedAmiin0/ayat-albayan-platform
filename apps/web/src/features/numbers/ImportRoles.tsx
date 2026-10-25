import type { ImportBlock, ImportFieldView, ImportRoleView } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';

const im = t.numbers.import;

/** A field's value (secrets: «قيمة سرية لا تُعرض», never a value) and where it comes from. */
function FieldLine({ field }: { field: ImportFieldView }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2" data-field={field.field}>
      <span className="font-semibold text-ink">{t.numbers.fields[field.field]}:</span>
      {field.secret ? (
        <span className="text-ink-2">{im.secretHidden}</span>
      ) : (
        field.value && <Ltr className="whitespace-normal break-all font-mono">{field.value}</Ltr>
      )}
      <span className="text-ink-3">({im.source[field.source]})</span>
    </li>
  );
}

/** «لا يمكن استيراده» and the fields whose ids fail the checks, by label only (never the value). */
function NotImportable({ block }: { block: ImportBlock }) {
  const names = block.fields.map((f) => t.numbers.fields[f]).join(t.common.listSeparator);
  return (
    <div className="grid gap-0.5" data-testid="not-importable">
      <p className="font-semibold text-danger">{im.notImportable}</p>
      <p className="text-xs text-ink-2">{im.invalidId.replace('{{names}}', names)}</p>
    </div>
  );
}

/** The import preview, role by role: what happens, each field with its source, the secrets to copy. */
export function ImportRoles({ roles }: { roles: readonly ImportRoleView[] }) {
  return (
    <div className="grid gap-4">
      {roles.map((r) => (
        <section key={r.role} aria-label={t.numbers.purpose[r.role]} className="grid gap-1 text-sm">
          <h3 className="font-bold">{t.numbers.purpose[r.role]}</h3>
          {r.not_importable ? <NotImportable block={r.not_importable} /> : <p className="text-ink-2">{im.action[r.action]}</p>}
          {r.fields.length > 0 && (
            <ul className="grid gap-1 text-xs">
              {r.fields.map((f) => (
                <FieldLine key={f.field} field={f} />
              ))}
            </ul>
          )}
          {r.secrets_to_copy.length > 0 && (
            <p className="text-xs text-ink-2">
              {im.willCopy.replace('{{names}}', r.secrets_to_copy.map((name) => t.numbers.fields[name]).join(t.common.listSeparator))}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
