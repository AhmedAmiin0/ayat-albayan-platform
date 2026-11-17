// Lighter health checks (ci/api-image-cache, 2026-11-17): 30 s between checks once healthy, but
// every 5 s for the whole of roll.sh's healthy() wait, so a fresh container is still seen healthy
// as soon as before.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APPS, roll, services } from './compose.fixture.mjs';

const seconds = (v) => Number(/^(\d+)s$/.exec(v)?.[1] ?? NaN);
const tries = Number(/while \[ "\$i" -lt (\d+) \]/.exec(roll)?.[1]);
const pause = Number(/i=\$\(\(i \+ 1\)\)\n\s*sleep (\d+)/.exec(roll)?.[1]);

test("roll.sh's healthy() still waits 90 × 2 s for Docker's own health status", () => {
  assert.equal(tries * pause, 180);
  assert.match(roll, /\{\{if \.State\.Health\}\}\{\{\.State\.Health\.Status\}\}/);
});

test('API copies, worker and PDF sandbox: 30 s once healthy, 5 s through the whole roll wait', () => {
  for (const name of [...APPS, 'ayat-pdf']) {
    const h = services[name].healthcheck;
    assert.equal(seconds(h.interval), 30, name);
    assert.equal(seconds(h.timeout), 3, name);
    assert.equal(h.retries, 3, name);
    assert.equal(seconds(h.start_interval), 5, name);
    assert.ok(seconds(h.start_period) >= tries * pause, `${name}: start_period covers roll.sh's wait`);
  }
});
