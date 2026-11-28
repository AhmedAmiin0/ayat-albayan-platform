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
  ],
  invalid: [
    { code: "call({ path: '/leads' });", errors: [literal] },
    { code: 'call({ method: "DELETE", path: `/leads/${id}` });', errors: [literal] },
    { code: "publicCall({ path: '/public/config' });", errors: [literal] },
    { code: "call('/leads');", errors: [literal] },
    { code: "call({ 'path': '/leads' });", errors: [literal] },
  ],
});
