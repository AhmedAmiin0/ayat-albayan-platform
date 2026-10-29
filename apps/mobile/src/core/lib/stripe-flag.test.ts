import { appOpenUrl } from './stripe-flag';

const PAY = `https://api.example.test/pay/${'a'.repeat(32)}`;

test('the test build opens a pay page with ?from=app (its page then brings the payer back)', () => {
  expect(appOpenUrl(PAY, true)).toBe(`${PAY}?from=app`);
  expect(appOpenUrl(`http://localhost:3000/pay/${'A_-9'.repeat(10)}`, true)).toBe(`http://localhost:3000/pay/${'A_-9'.repeat(10)}?from=app`);
});

test.each([
  [PAY, false],
  [`${PAY}?from=app`, true],
  [`${PAY}/done`, true],
  ['https://api.example.test/pay/short', true],
  ['https://meet.test/ab', true],
  [`https://x.test/other/pay/${'a'.repeat(32)}`, true],
  [`ayatalbayan://pay/${'a'.repeat(32)}`, true],
])('%s (test build %s): unchanged', (href, on) => {
  expect(appOpenUrl(href, on)).toBe(href);
});
