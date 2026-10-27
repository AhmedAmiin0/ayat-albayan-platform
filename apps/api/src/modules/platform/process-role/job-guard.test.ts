import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../..');
/** Timers every copy needs (a per-process cache, never a job on shared rows): not gated, docs/09. */
const PER_COPY = ['modules/platform/translations/translations.service.ts'];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return files(path);
    return e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('every timer started at boot is a @BackgroundJob (docs/09 «Two API copies + one worker»)', () => {
  it('no onApplicationBootstrap timer outside the one job runner, so two API copies never both run it', () => {
    const ungated = files(SRC)
      .filter((f) => {
        const text = readFileSync(f, 'utf8');
        return /onApplicationBootstrap\(\)/.test(text) && /set(Interval|Timeout)\(/.test(text) && !text.includes('@BackgroundJob(');
      })
      .map((f) => relative(SRC, f).replaceAll('\\', '/'));
    expect(ungated).toEqual(PER_COPY);
  });
});
