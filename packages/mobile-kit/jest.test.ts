import { join } from 'node:path';
import { moduleNameMapper, setupFiles } from './jest.cjs';

const KIT = __dirname;
const [[pattern, target]] = Object.entries(moduleNameMapper);
const mapped = (name: string): string | null => {
  const match = new RegExp(pattern).exec(name);
  return match ? target.replace('$1', match[1]) : null;
};

describe('the kit’s jest wiring for the apps', () => {
  it('runs the shared setup (RTL, language, storage, Supabase, tz) first', () => {
    expect(setupFiles).toEqual([join(KIT, 'jest.shared.cjs')]);
  });

  it('lets a test mock any kit module by its path under src', () => {
    expect(mapped('@ab/mobile-kit/lib/http/api')).toBe(`${KIT}/src/lib/http/api`);
    expect(mapped('@ab/mobile-kit/auth/use-auth-gate')).toBe(`${KIT}/src/auth/use-auth-gate`);
    expect(mapped('@ab/mobile-kit/room')).toBe(`${KIT}/src/room`);
  });

  it('leaves the root entry and other packages to the normal resolver', () => {
    expect(mapped('@ab/mobile-kit')).toBeNull();
    expect(mapped('@ab/mobile-kit-x/a')).toBeNull();
    expect(mapped('@ab/web-kit/a')).toBeNull();
  });
});
