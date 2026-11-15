import * as Sharing from 'expo-sharing';
import { shareRedirect } from './share-redirect';

jest.mock('expo-sharing', () => ({ getSharedPayloads: jest.fn(() => []) }));
const payloads = jest.mocked(Sharing.getSharedPayloads);
const TEXT = { value: 'hello', shareType: 'text' as const, mimeType: 'text/plain' };

beforeEach(() => payloads.mockReturnValue([]));

test('the expo-sharing URL opens the root share screen while a share waits', () => {
  payloads.mockReturnValue([TEXT]);
  expect(shareRedirect('ayatalbayan://expo-sharing')).toBe('/share');
});

test('a stale share URL (relaunch, language reload: the share was read) goes home', () => {
  expect(shareRedirect('ayatalbayan://expo-sharing')).toBe('/');
});

test('a store that cannot be read counts as empty: home, never the empty chooser', () => {
  payloads.mockImplementation(() => {
    throw new Error('no native module');
  });
  expect(shareRedirect('ayatalbayan://expo-sharing')).toBe('/');
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
  payloads.mockReturnValue([TEXT]);
  expect(shareRedirect('ayatalbayan://inbox/expo-sharing')).toBe('ayatalbayan://inbox/expo-sharing');
});
