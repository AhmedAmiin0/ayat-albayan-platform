import { testRule } from '../rule-testers.js';
import { consistentTypeImportsRule } from './index.js';

const all = (code, output) => ({ code, output, errors: [{ messageId: 'typeOverValue' }] });

testRule(
  { name: 'consistent-type-imports', rule: consistentTypeImportsRule, lang: 'ts' },
  {
    valid: [
      "import type { A } from 'a';\nlet x: A;",
      "import { A } from 'a';\nnew A();",
      "import { A } from 'a';\nexport { A };",
      "import { type A, B } from 'a';\nlet x: A = new B();",
      "import { A } from 'a';\nlet x: typeof A.b = 1;\nA.c();",
      // Nest DI: the type of a decorated class's constructor parameter is emitted as metadata.
      "import { A } from 'a';\n@Injectable()\nclass S { constructor(private readonly a: A) {} }",
      "import { A } from 'a';\n@Injectable()\nclass S { constructor(a: A | null) { void a; } }",
      "import { A } from 'a';\nclass S { constructor(@Inject(T) a: A) { void a; } }",
      "import { A } from 'a';\nclass S { @Get() run(a: A): void { void a; } }",
      "import { B } from 'b';\nclass S { @Get() async run(): B { return 1; } }",
      "import { A } from 'a';\nclass S { run(@Body() a: A) { void a; } }",
      "import { A } from 'a';\nclass S { @Prop() a: A; }",
      "import { A } from 'a';\nimport { B } from 'b';\nclass S { @Get() run(a: A.B): void {} }",
      "import { A } from 'a';",
    ],
    invalid: [
      all("import { A } from 'a';\nlet x: A;", "import type { A } from 'a';\nlet x: A;"),
      all("import A from 'a';\nlet x: A;", "import type A from 'a';\nlet x: A;"),
      all("import * as A from 'a';\nlet x: A.B;", "import type * as A from 'a';\nlet x: A.B;"),
      all(
        "import { A, B } from 'a';\nlet x: A;\nlet y: typeof B;",
        "import type { A, B } from 'a';\nlet x: A;\nlet y: typeof B;",
      ),
      // Not a metadata position: no decorator on the class, the method or the parameter.
      all(
        "import { A } from 'a';\nclass S { constructor(private readonly a: A) {} }",
        "import type { A } from 'a';\nclass S { constructor(private readonly a: A) {} }",
      ),
      all(
        "import { A } from 'a';\n@Injectable()\nclass S { run(a: A) { void a; } }",
        "import type { A } from 'a';\n@Injectable()\nclass S { run(a: A) { void a; } }",
      ),
      all(
        "import { A } from 'a';\n@Injectable()\nclass S { constructor(a: Map<string, A>) {} }",
        "import type { A } from 'a';\n@Injectable()\nclass S { constructor(a: Map<string, A>) {} }",
      ),
      {
        code: "import { A, B } from 'a';\nlet x: A = new B();",
        output: "import { B } from 'a';\nimport type { A } from 'a';\nlet x: A = new B();",
        errors: [{ messageId: 'aImportIsOnlyTypes', data: { typeImports: '"A"' } }],
      },
      {
        code: "import C, { A, B } from 'a';\nlet x: A = new B(C);",
        output: "import C, { B } from 'a';\nimport type { A } from 'a';\nlet x: A = new B(C);",
        errors: [{ messageId: 'aImportIsOnlyTypes' }],
      },
      {
        code: "import { A, B, C, D } from 'a';\nlet x: A | B | C = new D();",
        output: "import { D } from 'a';\nimport type { A, B, C } from 'a';\nlet x: A | B | C = new D();",
        errors: [{ messageId: 'someImportsAreOnlyTypes', data: { typeImports: '"A", "B" and "C"' } }],
      },
      {
        code: "import { type A, B } from 'a';\nlet x: A;\nlet y: B;",
        output: null,
        errors: [{ messageId: 'typeOverValue' }],
      },
      {
        code: "let x: import('a').A;",
        output: null,
        errors: [{ messageId: 'noImportTypeAnnotations' }],
      },
    ],
  },
);
