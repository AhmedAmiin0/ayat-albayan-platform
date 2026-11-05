import { shareRedirect } from './share-redirect';

test('the expo-sharing URL opens the root share screen', () => {
  expect(shareRedirect('ayatalbayan://expo-sharing')).toBe('/share');
});

test('the Stripe return keeps its path and query', () => {
  const pay = 'ayatalbayan://pay-done?token=t&r=done';
  expect(shareRedirect(pay)).toBe(pay);
});

test('an app path and garbage pass through unchanged, without throwing', () => {
  expect(shareRedirect('/inbox/thread/%2B201000000000')).toBe('/inbox/thread/%2B201000000000');
  expect(shareRedirect('::not a url::')).toBe('::not a url::');
  expect(shareRedirect('')).toBe('');
});

test('only the host counts: a path that mentions expo-sharing is left alone', () => {
  expect(shareRedirect('ayatalbayan://inbox/expo-sharing')).toBe('ayatalbayan://inbox/expo-sharing');
});
