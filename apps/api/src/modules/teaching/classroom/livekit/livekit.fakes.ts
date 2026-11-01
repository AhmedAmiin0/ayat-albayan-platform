// Test fixtures of the LiveKit transport (not shipped; excluded from the build by *.fakes.ts).

/** A Twirp answer as LiveKit sends it: `body` as JSON, or a string body as is. */
export const twirpAnswer = (status: number, body: object | string = {}): Response =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

/** The JSON body one recorded call sent ({} when there is none). */
export const sentBody = (init?: RequestInit): unknown =>
  JSON.parse(typeof init?.body === 'string' ? init.body : '{}');

/** One header of a recorded call ('' when absent). */
export const sentHeader = (init: RequestInit | undefined, name: string): string =>
  new Headers(init?.headers).get(name) ?? '';
