import assert from 'node:assert/strict';
import { test } from 'node:test';
import { widened } from './annotations.ts';

const WARN = "layer table widened: merge only with the repository owner's go";

test('a layer table widened annotation in a message or title is found', () => {
  assert.equal(widened([{ title: 'guard:packages', message: WARN }]), true);
  assert.equal(widened([{ title: WARN, message: null }]), true);
  assert.equal(widened([{ title: null, message: 'x' }, { title: null, message: `a ${WARN}` }]), true);
});

test('other annotations, empty fields and no annotations pass', () => {
  assert.equal(widened([]), false);
  assert.equal(widened([{ title: null, message: null }]), false);
  assert.equal(widened([{ title: 'guard:packages', message: 'layer table unchanged' }]), false);
  assert.equal(widened([{ title: 'Layer Table', message: 'widened' }]), false);
});
