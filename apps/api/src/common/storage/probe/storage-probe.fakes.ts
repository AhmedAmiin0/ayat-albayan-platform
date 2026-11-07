// Test helper (not a test): the public host as the probe meets it, PUT then GET of one object.

type Call = { url: string; method: string; headers: Record<string, string> };

/** A public MinIO that stores the PUT body and answers it on GET; `put` sets the PUT's status. */
export function publicHttp(put = 200) {
  const calls: Call[] = [];
  let body = new Uint8Array();
  const http = (url: string, init: RequestInit): Promise<Response> => {
    const method = init.method ?? 'GET';
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    calls.push({ url, method, headers });
    const answers: Record<string, () => Response> = {
      PUT: () => {
        body = new Uint8Array(init.body instanceof Uint8Array ? init.body : []);
        return new Response(null, { status: put });
      },
      GET: () => new Response(body, { status: 200 }),
    };
    return Promise.resolve(answers[method]?.() ?? new Response(null, { status: 405 }));
  };
  return Object.assign(http, { calls });
}
