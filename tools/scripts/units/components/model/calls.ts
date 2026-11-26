import ts from 'typescript';
import { calleeName } from './source.ts';

const initCall = (d: ts.VariableDeclaration): string =>
  d.initializer !== undefined && ts.isCallExpression(d.initializer)
    ? calleeName(d.initializer)
    : '';

/** `const … = name(…)` for every declaration of the statement. */
export const declaresCallTo = (s: ts.Statement, name: string): boolean =>
  ts.isVariableStatement(s) && s.declarationList.declarations.every((d) => initCall(d) === name);

/** `name(…);` as a statement of its own. */
export const isCallStatement = (s: ts.Statement, name: string): boolean =>
  ts.isExpressionStatement(s) &&
  ts.isCallExpression(s.expression) &&
  calleeName(s.expression) === name;

export const isTheme = (s: ts.Statement): boolean => declaresCallTo(s, 'useTheme');
