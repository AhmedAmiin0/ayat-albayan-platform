// The `ab/*` rule tests run each case list under Oxlint's RuleTester (oxlint/plugins-dev), which
// loads the rule object as the `ab` JS plugin does (docs/31b §6).
import { describe, it } from 'node:test';
import { RuleTester } from 'oxlint/plugins-dev';

RuleTester.describe = describe;
RuleTester.it = it;

/** `cases` ({ valid, invalid }) of `rule` under Oxlint; `lang`: 'js' or 'ts'. */
export function testRule({ name, rule, lang = 'js' }, cases) {
  const languageOptions = { sourceType: 'module', parserOptions: { lang } };
  new RuleTester({ eslintCompat: true, languageOptions }).run(name, rule, cases);
}
