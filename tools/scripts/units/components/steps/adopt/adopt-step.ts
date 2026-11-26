import { posix } from 'node:path';
import ts from 'typescript';
import type { AdoptInput, AdoptVerdict } from './adopt.types.ts';
import { fileOfHook, hookFiles } from './hook-files.ts';
import { retarget } from './importers.ts';
import { partition } from './partition.ts';
import { declaresCallTo, isCallStatement, isTheme } from '../../model/calls.ts';
import { componentsOf } from '../../model/components.ts';
import { importsOf } from '../../model/imports.ts';
import { partsOf } from '../../model/parts.ts';
import { all, no, ok } from '../../model/result.ts';
import { calleeName, findAll, isCallTo, parseFile } from '../../model/source.ts';
import { ownHookCalls } from '../hook/refusals.ts';
import type { Retarget } from './adopt.types.ts';
import type { Group } from './adopt.types.ts';
import type { Result } from '../../model/model.types.ts';

const HOOK_FILE = /\/use-[^/]+\.tsx?$/;
const TEST = /\.(?:test|spec)\.tsx?$|\/tests?\//;
// The lint tightenings flag these inside Name/ (docs/63 §2): such a hook stays for hand work.
const HAND = /^(?:apiFetch|apiSend|useEffect|useLayoutEffect)$/;

const refuse = (why: string): AdoptVerdict => ({ result: 'refused', why });

/** The view keeps an optional `useTheme()` and its one call to the hook, nothing else. */
function onlyCalls(sf: ts.SourceFile, name: string): boolean {
  const own = `use${name}`;
  const c = componentsOf(sf).find((x) => x.name === name);
  if (c?.fn.body === undefined) return false;
  const calls = ownHookCalls(c.fn);
  const plain = partsOf(c.fn.body).setup.every(
    (s) => isTheme(s) || declaresCallTo(s, own) || isCallStatement(s, own),
  );
  return plain && calls.length === 1 && calls.every((x) => calleeName(x) === own);
}

function checkSource(input: AdoptInput, old: string, sf: ts.SourceFile): string | undefined {
  const own = `use${input.name}`;
  const shared = input.users(old).find((f) => f !== input.path && !TEST.test(f));
  if (shared !== undefined)
    return `${own} is also imported by ${shared}: rename it to its purpose first`;
  const hand = findAll(parseFile(old, input.read(old)), (n) => isCallTo(n, HAND)).find(
    ts.isCallExpression,
  );
  if (hand !== undefined) return `the hook calls ${calleeName(hand)}`;
  return onlyCalls(sf, input.name) ? undefined : `statements beside ${own}: merge them by hand`;
}

function targetsOf(input: AdoptInput, groups: readonly Group[]): Result<Map<string, string>> {
  const dir = posix.dirname(input.path);
  const files = new Map(groups.map((g) => [g.root, fileOfHook(dir, g.root)]));
  const taken = [...files.values()].find((f) => input.folder.includes(posix.basename(f)));
  return taken === undefined ? ok(files) : no(`${posix.basename(taken)} already exists`);
}

function retargetUsers(input: AdoptInput, sf: ts.SourceFile, rt: Retarget) {
  const users = [input.path, ...input.users(rt.old).filter((f) => f !== input.path)];
  const texts = all(users, (f): Result<[string, string]> => {
    const next = retarget(f, f === input.path ? sf.text : input.read(f), rt);
    return next.ok ? ok([f, next.value]) : no(next.why);
  });
  return texts.ok ? ok(Object.fromEntries(texts.value)) : no<Record<string, string>>(texts.why);
}

function adopt(input: AdoptInput, old: string, sf: ts.SourceFile): AdoptVerdict {
  const own = `use${input.name}`;
  const hookSf = parseFile(old, input.read(old));
  const groups = partition(hookSf, own);
  if (!groups.ok) return refuse(groups.why);
  const targets = targetsOf(input, groups.value);
  if (!targets.ok) return refuse(targets.why);
  const at = { sf: hookSf, from: old, repo: input, own, files: targets.value };
  const hooks = hookFiles(at, groups.value);
  if (!hooks.ok) return refuse(hooks.why);
  const rt = { old, targets: targets.value, ownFile: targets.value.get(own) ?? '', repo: input };
  const users = retargetUsers(input, sf, rt);
  if (!users.ok) return refuse(users.why);
  return { result: 'adopted', files: { ...hooks.value, ...users.value }, deleted: [old] };
}

/** Step 6 (docs/63 §4): a same-name hook only its component reads moves into `Name/`. */
export function adoptStep(input: AdoptInput): AdoptVerdict {
  const sf = parseFile(input.path, input.text);
  const own = `use${input.name}`;
  const decl = importsOf(sf).find((d) => d.named.some((n) => n.local === own));
  const local = `./${posix.basename(fileOfHook('.', own), '.ts')}`;
  if (decl === undefined || decl.spec === local) return { result: 'none' };
  const old = input.resolve(input.path, decl.spec);
  if (old === undefined || !HOOK_FILE.test(old))
    return refuse(`${own} comes from ${decl.spec}, not a hook file of this workspace`);
  const why = checkSource(input, old, sf);
  return why === undefined ? adopt(input, old, sf) : refuse(why);
}
