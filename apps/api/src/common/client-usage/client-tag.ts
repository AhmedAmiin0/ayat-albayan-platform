/** The request header the web and the phone (OTA to 0.2.0+) send: `X-AB-Client: <platform>/<build>` (docs/26 §2f). */
export const CLIENT_HEADER = 'x-ab-client';
export const UNTAGGED = 'untagged';

const PLATFORM_RE = /^[a-z]{2,16}$/;
const BUILD_RE = /^[A-Za-z0-9._+-]{1,40}$/;

/**
 * The header value → `platform/build`, or 'untagged' when it is missing, repeated or malformed
 * (so a client cannot grow the counter with junk; old builds send nothing).
 */
export function parseClientTag(value: string | string[] | undefined): string {
  if (typeof value !== 'string') return UNTAGGED;
  const parts = value.trim().split('/');
  if (parts.length !== 2) return UNTAGGED;
  const [platform = '', build = ''] = parts;
  return PLATFORM_RE.test(platform) && BUILD_RE.test(build) ? `${platform}/${build}` : UNTAGGED;
}
