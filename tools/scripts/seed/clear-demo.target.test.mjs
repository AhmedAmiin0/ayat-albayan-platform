// allowedTarget after the 2026-10-31 split (docs/09 «Staging»): DEMO seeds and clears reach the
// NEW staging project only; production (knxf…, formerly staging) is refused whatever the flag.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowedTarget, PRODUCTION_REF, STAGING_REF } from './clear-demo.plan.mjs';

const FLAG = ['--allow-remote-staging'];
const pooler = (ref, host = 'aws-1-eu-central-1') => `postgresql://postgres.${ref}:pw@${host}.pooler.supabase.com:5432/postgres`;

test('the staging ref is the new project, production is the old one', () => {
  assert.equal(STAGING_REF, 'gqkqbxxgqttfbbqoqedf');
  assert.equal(PRODUCTION_REF, 'knxfwiimjcifwckhwbim');
});

test('production is refused through the pooler (either host) and directly, even with the flag', () => {
  for (const url of [
    pooler(PRODUCTION_REF),
    pooler(PRODUCTION_REF, 'aws-0-eu-central-1'),
    `postgresql://postgres:pw@db.${PRODUCTION_REF}.supabase.co:5432/postgres`,
    `postgresql://postgres.${STAGING_REF}:pw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?options=${PRODUCTION_REF}`,
  ]) {
    assert.equal(allowedTarget(url, FLAG), false, url);
  }
});

test('staging: either Frankfurt pooler host with the flag, never without it, never another region or host', () => {
  assert.equal(allowedTarget(pooler(STAGING_REF), FLAG), true);
  assert.equal(allowedTarget(pooler(STAGING_REF, 'aws-0-eu-central-1'), FLAG), true);
  assert.equal(allowedTarget(pooler(STAGING_REF), []), false);
  assert.equal(allowedTarget(pooler(STAGING_REF, 'aws-1-us-east-1'), FLAG), false);
  assert.equal(allowedTarget(`postgresql://postgres.${STAGING_REF}:pw@evil.example:5432/postgres`, FLAG), false);
});
