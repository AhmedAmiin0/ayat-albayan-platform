import { describe, expect, it } from 'vitest';
import { assistantsRoutes as routes } from '..';

describe('assistantsRoutes access', () => {
  it.each([
    ['all', 'assistants.read'],
    ['mine', 'self.assistant'],
    ['forStudent', 'assistants.read'],
    ['assign', 'assistants.write'],
    ['remove', 'assistants.write'],
  ] as const)('%s lets %s in and is tagged classroom', (key, permission) => {
    expect(routes[key].permissions).toEqual([permission]);
    expect(routes[key].tags).toEqual(['classroom']);
  });
});
