import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

// docs/26 §2f (retiring an alias): every API call says which client and build sent it, so the API can
// count hits from untagged (older) phones. JS only: expo-constants and expo-updates are already in the
// binary (no new native module), so this ships by OTA.

const BUILD = /^[A-Za-z0-9._+-]{1,40}$/;

/** What the build is made of: the app version and, after an OTA update, that update's id. */
interface BuildFacts {
  version?: string | null;
  updateId?: string | null;
}

/** `<version>` or `<version>+<first 12 of the update id>`; anything unusable reads as 'dev'. */
export function buildId(facts: BuildFacts): string {
  const version = facts.version && BUILD.test(facts.version) ? facts.version : 'dev';
  const update = (facts.updateId ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
  const id = update ? `${version}+${update}` : version;
  return BUILD.test(id) ? id : 'dev';
}

export { CLIENT_HEADER } from '@ab/client-core';

let tag: string | null = null;

/**
 * The `X-AB-Client` value: `mobile/<build>`. Read on the first request (not at import, so screens and
 * tests that mock expo-constants never trip on it) and kept: an OTA applies on the next launch anyway.
 */
export function mobileClientTag(): string {
  if (tag) return tag;
  try {
    tag = `mobile/${buildId({ version: Constants.expoConfig?.version, updateId: Updates.updateId })}`;
  } catch {
    tag = 'mobile/dev'; // never block a request over a label
  }
  return tag;
}
