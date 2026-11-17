// The family app's signed browser link (/join/<token>, docs/50 §2, §7): 70 url-safe characters,
// where a random lesson link is 32. It names its (lesson, student), so the guest page asks no name
// and the API takes the student's. By shape only: the API verifies the signature.
const FAMILY_TOKEN = /^[A-Za-z0-9_-]{70}$/;

/** Could this /join token be a family join token? (Nothing is verified or read for it.) */
export const looksLikeFamilyToken = (linkToken: string): boolean => FAMILY_TOKEN.test(linkToken);
