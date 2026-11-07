import { noDupeArgsRule, noOctalRule } from './legacy-js.js';
import { testRule } from './rule-testers.js';

// Sloppy-mode scripts (.cjs): in a module both are parse errors.
const script = (code, errors) => ({ code, languageOptions: { sourceType: 'script' }, errors });

testRule(
  { name: 'no-dupe-args', rule: noDupeArgsRule },
  {
    valid: ['function f(a, b) {}', 'const f = function ({ a }, [b], ...c) {};'],
    invalid: [
      script('function f(a, a) {}', [{ messageId: 'unexpected', data: { name: 'a' } }]),
      // Destructured or default parameters make a clash a parse error: simple lists only.
      script('var f = function (a, b, a, b) {};', [
        { messageId: 'unexpected' },
        { messageId: 'unexpected' },
      ]),
    ],
  },
);

testRule(
  { name: 'no-octal', rule: noOctalRule },
  {
    valid: ['const a = 0o17;', 'const b = 0;', 'const c = 0.5;', "const d = '017';"],
    invalid: [script('var a = 017;', [{ messageId: 'noOctal' }]), script('var b = 08;', 1)],
  },
);
