import ts from 'typescript';
import type { Shape } from './hook.types.ts';
import { isTheme } from '../../model/calls.ts';
import { declaredNames, readsAny } from '../../model/names.ts';
import { no, ok } from '../../model/result.ts';
import { has, isJsx } from '../../model/source.ts';
import { inputsOf } from './inputs.ts';
import type { Pass } from './hook.types.ts';
import type { Result } from '../../model/model.types.ts';

interface Split {
  setup: ts.Statement[];
  theme: ts.Statement | undefined;
}

/** `useTheme` stays in the view unless the rest of the setup reads what it returns. */
function themeSplit(setup: readonly ts.Statement[], hoists: Shape['hoists']): Split {
  const theme = setup.find(isTheme);
  const rest = setup.filter((s) => s !== theme);
  const reads = readsAny([...rest, ...hoists.map((h) => h.call)]);
  const moves = theme !== undefined && declaredNames(theme).some((n) => reads.has(n));
  return moves ? { setup: [...setup], theme: undefined } : { setup: rest, theme };
}

interface Outer {
  others: ts.Statement[];
  params: readonly ts.Node[];
  viewReads: ReadonlySet<string>;
}

/** Top-level declarations only the setup reads: they move into the hook, unexported. */
function movedOf(o: Outer): ts.Statement[] {
  return o.others.filter((s) => {
    const elsewhere = readsAny([...o.others.filter((x) => x !== s), ...o.params]);
    const names = declaredNames(s);
    return names.length > 0 && names.every((n) => !o.viewReads.has(n) && !elsewhere.has(n));
  });
}

/** Pass 3: what moves, what stays, what the hook takes and returns. */
export function shapeOf(third: Pass, hoists: Shape['hoists']): Result<Shape> {
  const { sf, c, parts } = third;
  if (parts.ret === undefined) return no('no final return');
  const { setup, theme } = themeSplit(parts.setup, hoists);
  const viewReads = readsAny([...parts.guards, parts.ret, ...(theme === undefined ? [] : [theme])]);
  const others = sf.statements.filter((s) => !ts.isImportDeclaration(s) && s !== c.statement);
  const moved = movedOf({ others, params: c.fn.parameters, viewReads });
  if (moved.some((s) => has(s, isJsx))) return no('JSX in top-level code the setup reads');
  const setupReads = readsAny([...setup, ...moved, ...hoists.map((h) => h.call)]);
  const shared = others.some(
    (s) => !moved.includes(s) && declaredNames(s).some((n) => setupReads.has(n)),
  );
  if (shared) return no('top-level code the JSX also reads (helpers step first)');
  const declared = [...setup.flatMap(declaredNames), ...hoists.map((h) => h.name)];
  const inputs = inputsOf(c.fn, setupReads);
  if (!inputs.ok) return no(inputs.why);
  const outputs = declared.filter((n) => viewReads.has(n));
  const { guards, ret } = parts;
  return ok({
    sf,
    fn: c.fn,
    statement: c.statement,
    setup,
    theme,
    hoists,
    guards,
    ret,
    moved,
    outputs,
    inputs: inputs.value,
  });
}
