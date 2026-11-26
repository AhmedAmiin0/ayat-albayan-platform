import ts from 'typescript';
import { has, isJsx, PASCAL } from './source.ts';
import type { ComponentFn } from './model.types.ts';
import type { Component } from './model.types.ts';

const isInnerFn = (a: ts.Node): a is ts.ArrowFunction | ts.FunctionExpression =>
  ts.isArrowFunction(a) || ts.isFunctionExpression(a);

/** The function an initializer holds: itself, or the one a call wraps (`memo(function A…)`). */
function functionOf(init: ts.Expression | undefined): Omit<Component, 'name' | 'statement'>[] {
  if (init !== undefined && isInnerFn(init)) return [{ fn: init, wrapped: false }];
  const inner =
    init !== undefined && ts.isCallExpression(init) ? init.arguments.find(isInnerFn) : undefined;
  return inner === undefined ? [] : [{ fn: inner, wrapped: true }];
}

const returnsJsx = (fn: ComponentFn): boolean => fn.body !== undefined && has(fn.body, isJsx);

const named = (name: string, fn: ComponentFn): boolean => PASCAL.test(name) && returnsJsx(fn);

function fromDeclaration(d: ts.VariableDeclaration, statement: ts.Statement): Component[] {
  if (!ts.isIdentifier(d.name)) return [];
  const name = d.name.text;
  return functionOf(d.initializer)
    .filter((f) => named(name, f.fn))
    .map((f) => ({ name, ...f, statement }));
}

function fromFunction(s: ts.FunctionDeclaration): Component[] {
  const name = s.name?.text ?? '';
  return named(name, s) ? [{ name, fn: s, wrapped: false, statement: s }] : [];
}

function fromStatement(s: ts.Statement): Component[] {
  if (ts.isFunctionDeclaration(s)) return fromFunction(s);
  if (!ts.isVariableStatement(s)) return [];
  return s.declarationList.declarations.flatMap((d) => fromDeclaration(d, s));
}

/** Top-level PascalCase functions, or consts holding one, whose body has JSX. */
export const componentsOf = (sf: ts.SourceFile): Component[] =>
  sf.statements.flatMap(fromStatement);
