// The family app's signed browser link (/join/<token>): 70 url-safe characters, where a random
// lesson link is 32. Its token names the (lesson, student), so the page never asks a name: the
// API takes the student's. By shape only: the API verifies the signature.
const FAMILY_TOKEN = /^[A-Za-z0-9_-]{70}$/;

/** Does this /join token name its student (the family app's signed link)? */
export const namesItsStudent = (linkToken: string): boolean => FAMILY_TOKEN.test(linkToken);
