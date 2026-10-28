import { avatarTones } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import css from './avatar-tones.css?raw';

/** `--avatar-N` values of the first block after `selector`, in order. */
function tones(selector: string): string[] {
  const from = css.indexOf(selector);
  const body = css.slice(css.indexOf('{', from) + 1, css.indexOf('}', from));
  return [...body.matchAll(/--avatar-(\d+):\s*([^;]+);/g)].map((m) => m[2]?.trim() ?? '');
}

describe('avatar-tones.css', () => {
  it('light, dark and the no-JS dark fallback are exactly packages/shared avatarTones', () => {
    expect(tones(":root,\n[data-theme='light']")).toEqual([...avatarTones.light]);
    expect(tones("\n[data-theme='dark']")).toEqual([...avatarTones.dark]);
    expect(tones(":root:not([data-theme='light'])")).toEqual([...avatarTones.dark]);
  });
});
