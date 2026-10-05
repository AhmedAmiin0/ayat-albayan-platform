import { PERMISSION_GROUPS, type Permission } from '@ab/shared';
import { t } from '@/lib/i18n';
import {
  allState,
  columnState,
  grantedCount,
  hasWildcard,
  isGranted,
  moduleState,
  setAll,
  setColumn,
  setModule,
  setPermission,
  TOTAL_CELLS,
} from './matrix';
import { TriCheckbox } from './TriCheckbox';

export interface PermissionMatrixProps {
  value: readonly Permission[];
  onChange: (next: Permission[]) => void;
  /** Read-only view (a role without roles.manage, or the wildcard). */
  disabled?: boolean;
}

const perm = t.roles.perm as Record<string, { view: string; manage: string }>;
const moduleName = t.roles.module as Record<string, string>;
const cell = 'border-b border-rule px-3 py-2 text-center';

/**
 * Permissions grouped by module: a «عرض» and an «إدارة» column, select-all per module (row), per
 * column and overall. Plain checkboxes in a table, so the keyboard works as it does everywhere.
 */
export function PermissionMatrix({ value, onChange, disabled = false }: PermissionMatrixProps) {
  const wildcard = hasWildcard(value);
  const locked = disabled || wildcard;
  return (
    <section aria-labelledby="perm-matrix-title" className="grid gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h3 id="perm-matrix-title" className="font-display text-h4 font-bold text-ink">
          {t.roles.matrix.heading}
        </h3>
        <span className="text-sm text-ink-3 tabular-nums">
          {t.roles.matrix.selected.replace('{count}', String(grantedCount(value))).replace('{total}', String(TOTAL_CELLS))}
        </span>
        <TriCheckbox state={allState(value)} label={t.roles.matrix.selectAll} disabled={locked} onChange={(on) => onChange(setAll(on))} />
      </div>
      {wildcard && <p className="text-sm text-ink-2">{t.roles.matrix.wildcardHint}</p>}
      <p className="text-xs text-ink-3">{t.roles.matrix.manageImpliesView}</p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs text-ink-3">
            <th scope="col" className="border-b border-rule-strong px-3 py-2 text-start font-semibold">
              {t.roles.matrix.module}
            </th>
            {(['view', 'manage'] as const).map((action) => (
              <th key={action} scope="col" className="border-b border-rule-strong px-3 py-2 font-semibold">
                <span className="inline-flex items-center gap-2">
                  {t.roles.matrix[action]}
                  <TriCheckbox
                    state={columnState(value, action)}
                    label={t.roles.matrix.selectColumn.replace('{column}', t.roles.matrix[action])}
                    disabled={locked}
                    onChange={(on) => onChange(setColumn(value, action, on))}
                  />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_GROUPS.map(({ module }) => (
            <tr key={module} className="hover:bg-sunk">
              <th scope="row" className="border-b border-rule px-3 py-2 text-start font-medium text-ink">
                <span className="inline-flex items-center gap-2">
                  <TriCheckbox
                    state={moduleState(value, module)}
                    label={t.roles.matrix.selectModule.replace('{module}', moduleName[module] ?? module)}
                    disabled={locked}
                    onChange={(on) => onChange(setModule(value, module, on))}
                  />
                  {moduleName[module]}
                </span>
              </th>
              {(['view', 'manage'] as const).map((action) => (
                <td key={action} className={cell}>
                  <TriCheckbox
                    state={isGranted(value, module, action) ? 'all' : 'none'}
                    label={perm[module]?.[action] ?? `${module}.${action}`}
                    disabled={locked}
                    onChange={(on) => onChange(setPermission(value, { module, action }, on))}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
