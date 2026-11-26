import ts from 'typescript';
import { bindingNames } from '../../model/names.ts';
import { no, ok } from '../../model/result.ts';
import type { Result } from '../../model/model.types.ts';
import type { Inputs } from './hook.types.ts';

const NONE: Inputs = { param: '', arg: '' };

function typeText(p: ts.ParameterDeclaration): Result<string> {
  if (p.type === undefined) return no('untyped props');
  if (ts.isTypeLiteralNode(p.type)) return no('an inline props type (types step first)');
  return ok(p.type.getText());
}

const keyOf = (e: ts.BindingElement): string => (e.propertyName ?? e.name).getText();

const union = (keys: string[]): string => keys.map((k) => `'${k}'`).join(' | ');

const pick = (type: string, keys: string[], wrap: (t: string) => string): string[] =>
  keys.length === 0 ? [] : [wrap(`Pick<${type}, ${union(keys)}>`)];

/** `Pick<P, plain keys> & Required<Pick<P, defaulted keys>>`: defaults arrive resolved. */
function pickType(type: string, used: ts.BindingElement[]): string {
  const plain = used.filter((e) => e.initializer === undefined).map(keyOf);
  const defaulted = used.filter((e) => e.initializer !== undefined).map(keyOf);
  return [...pick(type, plain, (t) => t), ...pick(type, defaulted, (t) => `Required<${t}>`)].join(
    ' & ',
  );
}

const entryOf = (e: ts.BindingElement): string =>
  e.propertyName === undefined ? e.name.getText() : `${keyOf(e)}: ${e.name.getText()}`;

interface PatternInput {
  pattern: ts.ObjectBindingPattern;
  type: string;
  reads: ReadonlySet<string>;
}

function fromPattern({ pattern, type, reads }: PatternInput): Result<Inputs> {
  const used = pattern.elements.filter((e) => bindingNames(e.name).some((n) => reads.has(n)));
  if (used.some((e) => e.dotDotDotToken !== undefined)) return no('the setup reads a rest element');
  if (used.some((e) => !ts.isIdentifier(e.name))) return no('nested props destructuring');
  const entries = used.map(entryOf).join(', ');
  return ok(
    used.length === 0
      ? NONE
      : { param: `{ ${entries} }: ${pickType(type, used)}`, arg: `{ ${entries} }` },
  );
}

function fromParam(p: ts.ParameterDeclaration, reads: ReadonlySet<string>): Result<Inputs> {
  const type = typeText(p);
  if (!type.ok) return type;
  if (ts.isIdentifier(p.name))
    return ok({ param: `${p.name.text}: ${type.value}`, arg: p.name.text });
  return ts.isObjectBindingPattern(p.name)
    ? fromPattern({ pattern: p.name, type: type.value, reads })
    : no('an array props pattern');
}

/** The hook's inputs: only the props the setup reads, defaults resolved by the component. */
export function inputsOf(fn: ts.SignatureDeclaration, reads: ReadonlySet<string>): Result<Inputs> {
  if (fn.parameters.length > 1) return no('more than one parameter');
  const [p] = fn.parameters;
  const read = p !== undefined && bindingNames(p.name).some((n) => reads.has(n));
  return read ? fromParam(p, reads) : ok(NONE);
}
