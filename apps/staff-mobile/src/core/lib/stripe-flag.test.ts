import { Platform } from 'react-native';
import { appOpenUrl } from './stripe-flag';

const PAY = `https://api.example.test/pay/${'a'.repeat(32)}`;

test('the test build opens a pay page with ?from=<its platform> (its page then brings the payer back)', () => {
  expect(['android', 'ios']).toContain(Platform.OS);
  expect(appOpenUrl(PAY, true)).toBe(`${PAY}?from=${Platform.OS}`);
  const local = `http://localhost:3000/pay/${'A_-9'.repeat(10)}`;
  expect(appOpenUrl(local, true)).toBe(`${local}?from=${Platform.OS}`);
});

test.each([
  [PAY, false],
  [`${PAY}?from=ios`, true],
  [`${PAY}/done`, true],
  ['https://api.example.test/pay/short', true],
  ['https://meet.test/ab', true],
  [`https://x.test/other/pay/${'a'.repeat(32)}`, true],
  [`ayatalbayan://pay/${'a'.repeat(32)}`, true],
])('%s (test build %s): unchanged', (href, on) => {
  expect(appOpenUrl(href, on)).toBe(href);
});
