import { describe, expect, it } from 'vitest';
import { maintenancePollMs, maintenanceView } from '../maintenance.js';
import type { MaintenanceFacts } from '../maintenance.types.js';

const on: MaintenanceFacts = { flag: true, down: false };
const off: MaintenanceFacts = { flag: false, down: false };
const down: MaintenanceFacts = { flag: false, down: true };

describe('maintenanceView (owner 2026-11-21)', () => {
  const out = { bypass: false, inRoom: false };
  const admin = { bypass: true, inRoom: false };
  const room = { bypass: false, inRoom: true };
  it.each([
    { name: 'unknown facts', facts: undefined, viewer: out, view: 'open' },
    { name: 'switch on, no bypass', facts: on, viewer: out, view: 'maintenance' },
    { name: 'switch on, admin', facts: on, viewer: admin, view: 'open' },
    { name: 'switch off', facts: off, viewer: out, view: 'open' },
    { name: 'API down, no bypass', facts: down, viewer: out, view: 'down' },
    { name: 'API down, admin too', facts: down, viewer: admin, view: 'down' },
    { name: 'switch on, in a lesson room', facts: on, viewer: room, view: 'open' },
    { name: 'API down, in a lesson room', facts: down, viewer: room, view: 'open' },
  ])('$name → $view', ({ facts, viewer, view }) => {
    expect(maintenanceView(facts, viewer)).toBe(view);
  });
});

describe('maintenancePollMs', () => {
  it.each([
    ['unknown', undefined, 10_000],
    ['switched on', on, 10_000],
    ['down', down, 10_000],
    ['healthy', off, 60_000],
  ] as const)('%s → %i ms', (_name, facts, ms) => {
    expect(maintenancePollMs(facts)).toBe(ms);
  });
});
