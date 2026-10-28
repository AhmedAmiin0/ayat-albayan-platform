import { avatarTones } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import css from './avatar-tones.css?raw';

/** The first block after `selector`. */
function block(selector: string): string {
  const from = css.indexOf(selector);
  return css.slice(css.indexOf('{', from) + 1, css.indexOf('}', from));
}

/** `--avatar-N` values of the first block after `selector`, in order. */
function tones(selector: string): string[] {
  return [...block(selector).matchAll(/--avatar-(\d+):\s*([^;]+);/g)].map((m) => m[2]?.trim() ?? '');
}

const rule = (selector: string) => /--avatar-rule:\s*([^;]+);/.exec(block(selector))?.[1]?.trim();

describe('avatar-tones.css', () => {
  it('light, dark and the no-JS dark fallback are exactly packages/shared avatarTones', () => {
    expect(tones(":root,\n[data-theme='light']")).toEqual([...avatarTones.light]);
    expect(tones("\n[data-theme='dark']")).toEqual([...avatarTones.dark]);
    expect(tones(":root:not([data-theme='light'])")).toEqual([...avatarTones.dark]);
  });

  it('the hairline is rule-strong in light and the more visible rule-input in dark', () => {
    expect(rule(":root,\n[data-theme='light']")).toBe('var(--rule-strong)');
    expect(rule("\n[data-theme='dark']")).toBe('var(--rule-input)');
    expect(rule(":root:not([data-theme='light'])")).toBe('var(--rule-input)');
  });
});
