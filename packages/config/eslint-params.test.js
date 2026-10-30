import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { maxParamsRule } from './eslint-params.js';

// TypeScript syntax (signatures, overloads, `this` parameters) needs the typescript-eslint parser.
const tester = new RuleTester({ languageOptions: { parser: tseslint.parser } });
const tooMany = (count, max) => ({ messageId: 'tooMany', data: { count, max } });

tester.run('max-params', maxParamsRule, {
  valid: [
    'function f(a, b, c) {}',
    'const f = (a, b, c) => a;',
    'class A { constructor(a, b, c, d) {} }',
    'abstract class A { constructor(a, b, c, d) {} }',
    'function f(this: Window, a: number, b: number, c: number) {}',
    'interface P { fillRect(x: number, y: number, w: number): void; new (a: 1, b: 2, c: 3, d: 4): P }',
    'type F = (a: 1, b: 2, c: 3) => void;',
  ],
  invalid: [
    { code: 'function f(a, b, c, d) {}', errors: [tooMany(4, 3)] },
    { code: 'const f = (a, b, c, d) => a;', errors: [tooMany(4, 3)] },
    { code: 'class A { m(a, b, c, d) {} }', errors: [tooMany(4, 3)] },
    { code: 'class A { constructor(a, b, c, d, e) {} }', errors: [tooMany(5, 4)] },
    { code: 'declare function f(a: 1, b: 2, c: 3, d: 4): void;', errors: [tooMany(4, 3)] },
    { code: 'abstract class A { abstract m(a: 1, b: 2, c: 3, d: 4): void }', errors: [tooMany(4, 3)] },
    { code: 'interface P { fillRect(x: number, y: number, w: number, h: number): void }', errors: [tooMany(4, 3)] },
    { code: 'interface P { (a: 1, b: 2, c: 3, d: 4): void }', errors: [tooMany(4, 3)] },
    { code: 'type F = (a: 1, b: 2, c: 3, d: 4) => void;', errors: [tooMany(4, 3)] },
  ],
});
