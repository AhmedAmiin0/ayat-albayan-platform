import { restrictedSyntaxRule } from './restricted-syntax.js';
import { testRule } from './rule-testers.js';

const effect = { selector: 'CallExpression[callee.name=/^use(Layout)?Effect$/]', message: 'hooks' };

testRule(
  { name: 'no-restricted-syntax', rule: restrictedSyntaxRule },
  {
    valid: [
      { code: 'useMemo(() => 1);', options: [effect] },
      { code: 'x.useEffect;', options: [effect] },
    ],
    invalid: [
      { code: 'useEffect(() => {});', options: [effect], errors: [{ message: 'hooks' }] },
      {
        code: 'useLayoutEffect(f); with (a) {}',
        options: [effect, 'WithStatement'],
        languageOptions: { sourceType: 'script' },
        errors: [{ message: 'hooks' }, { message: "Using 'WithStatement' is not allowed." }],
      },
    ],
  },
);
