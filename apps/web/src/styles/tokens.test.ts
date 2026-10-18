import { palette, type Palette } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import css from './tokens.css?raw';

const LIGHT = ":root,\n[data-theme='light']";
const DARK = "\n[data-theme='dark']";

/** Declarations inside the first `{ … }` after `selector`, whitespace-normalised and sorted. */
function block(selector: string): string[] {
  const from = css.indexOf(selector);
  const open = css.indexOf('{', from);
  const body = css.slice(open + 1, css.indexOf('}', open));
  return body
    .split(';')
    .map((d) => d.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .sort();
}

const name = (d: string) => d.slice(0, d.indexOf(':')).trim();
const value = (d: string) => d.slice(d.indexOf(':') + 1).trim();

// CSS raw-token name → the theme.ts key holding the same colour (docs/07 §12: one source).
const THEME_KEY: Record<string, keyof Palette> = {
  '--margin': 'margin', '--page': 'page', '--raised': 'raised', '--sunk': 'sunk',
  '--ink': 'ink', '--ink-2': 'ink2', '--ink-3': 'ink3',
  '--rule': 'rule', '--rule-strong': 'ruleStrong', '--rule-input': 'ruleInput',
  '--gold': 'gold', '--gold-soft': 'goldSoft', '--gold-wash': 'goldWash',
  '--lapis': 'lapis', '--lapis-fill': 'lapisFill', '--lapis-hover': 'lapisHover', '--lapis-wash': 'lapisWash', '--on-lapis': 'onLapis',
  '--verdigris': 'ok', '--verdigris-wash': 'okSoft',
  '--saffron': 'act', '--saffron-wash': 'actSoft',
  '--cinnabar': 'bad', '--cinnabar-solid': 'badSolid', '--cinnabar-wash': 'badSoft', '--on-cinnabar': 'onBad',
  '--neutral-wash': 'neutralSoft',
  '--inverse': 'inverse', '--on-inverse': 'onInverse', '--inverse-gold': 'inverseGold',
  '--cover': 'cover', '--leather': 'leather', '--leather-deep': 'leatherDeep', '--leather-lift': 'leatherLift',
  '--gold-on-cover': 'goldOnCover', '--cover-ink': 'coverInk', '--scrim': 'scrim', '--read': 'read', '--tick': 'tick',
};

describe('tokens.css (docs/07 §3)', () => {
  it('the no-JS dark fallback and [data-theme=dark] carry identical values', () => {
    const media = block(":root:not([data-theme='light'])");
    expect(media.length).toBeGreaterThan(30);
    expect(media).toEqual(block(DARK));
  });

  it('dark overrides every themed light token (the mint sidebar turns dark too)', () => {
    const light = block(LIGHT).map(name);
    const dark = new Set(block(DARK).map(name));
    expect(light.filter((n) => !dark.has(n))).toEqual([]);
  });

  it.each([
    ['light', [LIGHT]],
    ['dark', [LIGHT, DARK]],
  ] as const)('%s colours are exactly packages/shared theme.ts', (theme, selectors) => {
    // dark inherits what it does not override (the cover pair), so later blocks win
    const decl = new Map(selectors.flatMap((s) => block(s).map((d) => [name(d), value(d)] as const)));
    const colours = [...decl.keys()].filter((n) => !n.startsWith('--elev') && n !== 'color-scheme');
    expect(colours.sort()).toEqual(Object.keys(THEME_KEY).sort());
    for (const [cssName, key] of Object.entries(THEME_KEY)) {
      expect([cssName, decl.get(cssName)]).toEqual([cssName, palette[theme][key]]);
    }
  });
});
