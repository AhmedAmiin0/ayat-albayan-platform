import { testRule } from '../../rule-testers.js';
import { noApiPathLiteralRule } from '../index.js';

const literal = { messageId: 'literal' };

testRule({ name: 'no-api-path-literal', rule: noApiPathLiteralRule, lang: 'ts' }, {
  valid: [
    'call({ route: leadRoutes.list, query });',
    'call({ route: leadRoutes.one, params: { id } });',
    'call({ path: routePath(leadRoutes.one, { id }) });',
    'call({ method: "POST", path });',
    'publicCall({ route: signInRoutes.start, body });',
    // A path that does not start with a slash is not an api path.
    "call({ path: 'pages' });",
    'call({ path: `${base}/pages` });',
    // Function.prototype.call and other callees stay free.
    "fn.call(this, '/x');",
    "send({ path: '/x' });",
    // A helper the file writes itself (an inject wrapper, a sidecar) is not the api client.
    "const call = (url) => app.inject({ url }); call('/invoices');",
    "call({ path: '/pages' }); async function call(input) { return fetch(input.path); }",
    "const call = function (url) { return get(url); }; call('/x');",
  ],
  invalid: [
    { code: "call({ path: '/leads' });", errors: [literal] },
    { code: 'call({ method: "DELETE", path: `/leads/${id}` });', errors: [literal] },
    { code: "publicCall({ path: '/public/config' });", errors: [literal] },
    { code: "call('/leads');", errors: [literal] },
    { code: "call({ 'path': '/leads' });", errors: [literal] },
    { code: "const call = callWith(client); call({ path: '/leads' });", errors: [literal] },
    { code: "import { call } from '@ab/web-kit'; call({ path: '/leads' });", errors: [literal] },
  ],
});
