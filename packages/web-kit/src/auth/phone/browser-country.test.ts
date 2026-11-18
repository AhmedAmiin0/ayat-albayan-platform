import { defaultCountry } from '@ab/client-core';
import { expect, it } from 'vitest';
import { browserRegion } from './browser-country';

it('only a region the tag names; a bare language starts in Saudi Arabia', () => {
  expect(browserRegion('ar-QA')).toBe('QA');
  expect(browserRegion('en-GB')).toBe('GB');
  expect(defaultCountry(browserRegion('fr-FR')).code).toBe('FR');
  expect(defaultCountry(browserRegion('en')).code).toBe('SA');
  expect(defaultCountry(browserRegion('ar')).code).toBe('SA');
  expect(defaultCountry(browserRegion(undefined)).code).toBe('SA');
});
