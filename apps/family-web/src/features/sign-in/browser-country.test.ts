import { expect, it } from 'vitest';
import { browserCountry } from './browser-country';

it('the browser’s region when it is one of ours, else Saudi Arabia', () => {
  expect(browserCountry('ar-QA').code).toBe('QA');
  expect(browserCountry('ar-EG').code).toBe('EG');
  expect(browserCountry('fr-FR').code).toBe('SA');
  expect(browserCountry(undefined).code).toBe('SA');
});
