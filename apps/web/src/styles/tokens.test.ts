import { describe, expect, it } from 'vitest';
import css from './tokens.css?raw';

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

describe('tokens.css (docs/07 §3)', () => {
  it('the no-JS dark fallback and [data-theme=dark] carry identical values', () => {
    const media = block(":root:not([data-theme='light'])");
    expect(media.length).toBeGreaterThan(30);
    expect(media).toEqual(block("\n[data-theme='dark']"));
  });

  it('dark overrides every themed light token except the cover gold and cover ink', () => {
    const name = (d: string) => d.split(':')[0];
    const light = block(":root,\n[data-theme='light']").map(name);
    const dark = new Set(block("\n[data-theme='dark']").map(name));
    expect(light.filter((n) => !dark.has(n))).toEqual(['--cover-ink', '--gold-on-cover']);
  });
});
