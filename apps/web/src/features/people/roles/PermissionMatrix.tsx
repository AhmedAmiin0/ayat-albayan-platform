import { permissionGroups, type Permission } from '@ab/shared';
import { useEffect, useRef } from 'react';
import { t } from '@/lib/i18n/i18n';
import { groupState, type GroupState } from './role-form';

const BOX = 'size-4 shrink-0 accent-[var(--lapis)]';
const items: Record<string, string> = t.permissions.items;
const areas: Record<string, string> = t.permissions.areas;
/** Only some keys explain themselves (what exactly the permission shows or allows). */
const hints: Partial<Record<string, string>> = t.permissions.hints;

function GroupBox({ state, label, onToggle, disabled }: { state: GroupState; label: string; onToggle: () => void; disabled: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'some';
  }, [state]);
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-lapis">
      <input ref={ref} type="checkbox" className={BOX} checked={state === 'all'} onChange={onToggle} disabled={disabled} aria-label={label} />
      {t.permissions.page.selectAll}
    </label>
  );
}

export interface PermissionMatrixProps {
  value: readonly Permission[];
  onToggle: (permission: Permission) => void;
  onToggleGroup: (keys: readonly Permission[]) => void;
  /** The system admin: shown all ticked, not editable. */
  disabled?: boolean;
}

/** One fieldset per area (العملاء، الطلاب، المالية…), a checkbox per permission and «تحديد الكل». */
export function PermissionMatrix({ value, onToggle, onToggleGroup, disabled = false }: PermissionMatrixProps) {
  return (
    <div className="grid gap-4">
      {permissionGroups().map((group) => {
        const title = areas[group.area] ?? group.area;
        return (
          <fieldset key={group.area} className="grid gap-2 rounded-md border border-rule p-3">
            <legend className="px-1 text-sm font-bold text-ink">{title}</legend>
            <GroupBox
              state={groupState(value, group.keys)}
              label={`${t.permissions.page.selectAll}: ${title}`}
              onToggle={() => onToggleGroup(group.keys)}
              disabled={disabled}
            />
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {group.keys.map((key) => (
                <li key={key} className="grid gap-0.5">
                  <label className="flex items-start gap-2 text-sm text-ink-2">
                    <input
                      type="checkbox"
                      className={`${BOX} mt-0.5`}
                      checked={value.includes(key)}
                      onChange={() => onToggle(key)}
                      disabled={disabled}
                      aria-describedby={hints[key] ? `hint-${key}` : undefined}
                    />
                    <span>{items[key] ?? key}</span>
                  </label>
                  {hints[key] && (
                    <p id={`hint-${key}`} className="ps-6 text-xs text-ink-3">
                      {hints[key]}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}
