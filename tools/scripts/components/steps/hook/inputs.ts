import ts from 'typescript';
import { bindingNames } from '../../model/names.ts';

/** How the hook receives the props: its parameter text and the call's argument text. */
export interface Inputs {
  param: string;
  arg: string;
}

export type InputsOrRefusal = Inputs | { refused: string };

const NONE: Inputs = { param: '', arg: '' };

function typeText(p: ts.ParameterDeclaration): string | { refused: string } {
  if (p.type === undefined) return { refused: 'untyped props' };
  if (ts.isTypeLiteralNode(p.type)) return { refused: 'an inline props type (types step first)' };
  return p.type.getText();
}

const keyOf = (e: ts.BindingElement): string => (e.propertyName ?? e.name).getText();

const union = (keys: string[]): string => keys.map((k) => `'${k}'`).join(' | ');

function pickType(type: string, used: ts.BindingElement[]): string {
  const plain = used.filter((e) => e.initializer === undefined).map(keyOf);
  const defaulted = used.filter((e) => e.initializer !== undefined).map(keyOf);
  return [
    ...(plain.length === 0 ? [] : [`Pick<${type}, ${union(plain)}>`]),
    ...(defaulted.length === 0 ? [] : [`Required<Pick<${type}, ${union(defaulted)}>>`]),
  ].join(' & ');
}

const entryOf = (e: ts.BindingElement): string =>
  e.propertyName === undefined ? e.name.getText() : `${keyOf(e)}: ${e.name.getText()}`;

function fromPattern(
  pattern: ts.ObjectBindingPattern,
  type: string,
  reads: ReadonlySet<string>,
): InputsOrRefusal {
  const used = pattern.elements.filter((e) => bindingNames(e.name).some((n) => reads.has(n)));
  if (used.some((e) => e.dotDotDotToken !== undefined))
    return { refused: 'the setup reads a rest element' };
  if (used.some((e) => !ts.isIdentifier(e.name))) return { refused: 'nested props destructuring' };
  if (used.length === 0) return NONE;
  const entries = used.map(entryOf).join(', ');
  return { param: `{ ${entries} }: ${pickType(type, used)}`, arg: `{ ${entries} }` };
}

/** The hook's inputs: only the props the setup reads, defaults resolved by the component. */
export function inputsOf(fn: ts.SignatureDeclaration, reads: ReadonlySet<string>): InputsOrRefusal {
  if (fn.parameters.length > 1) return { refused: 'more than one parameter' };
  const [p] = fn.parameters;
  if (p === undefined) return NONE;
  const names = bindingNames(p.name);
  if (!names.some((n) => reads.has(n))) return NONE;
  const type = typeText(p);
  if (typeof type !== 'string') return type;
  if (ts.isIdentifier(p.name)) return { param: `${p.name.text}: ${type}`, arg: p.name.text };
  if (ts.isObjectBindingPattern(p.name)) return fromPattern(p.name, type, reads);
  return { refused: 'an array props pattern' };
}
