// The `ab/*` rule tests run each case list under both linters (docs/31b §6): ESLint's RuleTester
// and Oxlint's (oxlint/plugins-dev), which loads the same rule object as a JS plugin does.
import { describe, it } from 'node:test';
import { RuleTester as ESLintTester } from 'eslint';
import { RuleTester as OxlintTester } from 'oxlint/plugins-dev';
import tseslint from 'typescript-eslint';

for (const Tester of [ESLintTester, OxlintTester]) {
  Tester.describe = describe;
  Tester.it = it;
}

const ESLINT = {
  js: { ecmaVersion: 2024, sourceType: 'module' },
  ts: { parser: tseslint.parser, sourceType: 'module' },
};

/** `cases` ({ valid, invalid }) of `rule` under ESLint and Oxlint; `lang`: 'js' or 'ts'. */
export function testRule({ name, rule, lang = 'js' }, cases) {
  new ESLintTester({ languageOptions: ESLINT[lang] }).run(name, rule, cases);
  const languageOptions = { sourceType: 'module', parserOptions: { lang } };
  new OxlintTester({ eslintCompat: true, languageOptions }).run(`${name} (oxlint)`, rule, cases);
}
