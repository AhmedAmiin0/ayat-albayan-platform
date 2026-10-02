import { describe, expect, it } from 'vitest';
import ar from '../i18n/ar.json' with { type: 'json' };
import en from '../i18n/en.json' with { type: 'json' };

// en.json mirrors ar.json (Phase 7): the same key tree, and every string keeps the same
// {placeholders}, so `t` can swap dictionaries without any call site changing.
type Leaf = [path: string, value: unknown];

function leaves(node: unknown, path: string): Leaf[] {
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [[path, node]];
}

const tokens = (v: unknown): string[] => (typeof v === 'string' ? (v.match(/\{[A-Za-z0-9_]+\}/g) ?? []).sort() : []);

describe('en.json ↔ ar.json', () => {
  const arLeaves = new Map(leaves(ar, ''));
  const enLeaves = new Map(leaves(en, ''));

  it('has exactly the same keys', () => {
    expect([...enLeaves.keys()].filter((k) => !arLeaves.has(k))).toEqual([]);
    expect([...arLeaves.keys()].filter((k) => !enLeaves.has(k))).toEqual([]);
  });

  it('every English value is a non-empty string where Arabic has a string', () => {
    const bad = [...arLeaves].filter(([k, v]) => typeof v === 'string' && !String(enLeaves.get(k) ?? '').trim());
    expect(bad.map(([k]) => k)).toEqual([]);
  });

  it('keeps the same {placeholders} in every string', () => {
    const diff = [...arLeaves].filter(([k, v]) => tokens(v).join() !== tokens(enLeaves.get(k)).join());
    expect(diff.map(([k]) => k)).toEqual([]);
  });
});
