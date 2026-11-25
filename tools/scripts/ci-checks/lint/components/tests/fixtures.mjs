// Fixture trees for the guard tests: one compliant component folder and edits of it.
export const DIR = 'apps/staff-web/src/features/people/RoleDialog';

export const COMPLIANT = {
  [`${DIR}/RoleDialog.tsx`]: `import { useRoleDialog } from './use-role-dialog';
import type { RoleDialogProps } from './RoleDialog.types';

export function RoleDialog(props: RoleDialogProps) {
  const { open, rows, save, pick } = useRoleDialog(props);
  if (!open) return null;
  return (
    <Dialog onClose={() => save({ id: props.id, ...rows })}>
      {rows.map((r) => <Row key={r.id} label={(x) => x.name} onPick={() => void pick(r)} />)}
      <List renderItem={({ item }) => (item.ok ? <A /> : <B />)} keyExtractor={(i) => i.id} />
    </Dialog>
  );
}
`,
  [`${DIR}/RoleDialog.types.ts`]: 'export interface RoleDialogProps { id: string }\n',
  [`${DIR}/use-role-dialog.ts`]: `import { useState } from 'react';
import type { RoleDialogProps } from './RoleDialog.types';

export function useRoleDialog(props: RoleDialogProps) {
  const [open] = useState(true);
  return { open, rows: [], save: (x: unknown) => x, pick: (r: unknown) => r, id: props.id };
}
`,
  [`${DIR}/index.ts`]: "export { RoleDialog } from './RoleDialog';\n",
  [`${DIR}/RoleDialog.test.tsx`]: "test('x', () => {});\n",
};

/** COMPLIANT with `edits` applied; a null value removes the file. */
export const withFiles = (edits) =>
  Object.fromEntries(
    Object.entries({ ...COMPLIANT, ...edits }).filter(([, text]) => text !== null),
  );

/** The compliant component file with its JSX return replaced by `jsx`. */
export const withJsx = (jsx) => ({
  [`${DIR}/RoleDialog.tsx`]: `import { useRoleDialog } from './use-role-dialog';
export function RoleDialog(props: RoleDialogProps) {
  const { open, rows, save, pick } = useRoleDialog(props);
  return ${jsx};
}
`,
});
