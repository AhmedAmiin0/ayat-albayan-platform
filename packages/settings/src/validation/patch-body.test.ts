import { describe, expect, it } from 'vitest';
import { settingsPatchBodySchema } from './patch.js';

// docs/36 z3: the raw PATCH /settings body is any JSON object; its fields are split one by one.
describe('settingsPatchBodySchema', () => {
  it('an object passes whatever its fields hold', () => {
    const body = { lateCancelHours: 'nope', messagingEnabled: true, x: null };
    expect(settingsPatchBodySchema.parse(body)).toEqual(body);
  });

  it.each([null, undefined, [], 'x', 1])('%j fails with the one expected_object issue', (raw) => {
    const issues = settingsPatchBodySchema.safeParse(raw).error?.issues ?? [];
    expect(issues.map((i) => ({ path: i.path.join('.'), message: i.message }))).toEqual([
      { path: '', message: 'expected_object' },
    ]);
  });
});
