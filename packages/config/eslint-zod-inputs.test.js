import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { zodInputsRule } from './eslint-zod-inputs.js';

// Parameter decorators need the typescript-eslint parser.
const tester = new RuleTester({ languageOptions: { parser: tseslint.parser } });
const raw = (name, replacement) => ({ messageId: 'raw', data: { name, replacement } });
const nest = (names) => `import { ${names} } from '@nestjs/common';\n`;

tester.run('zod-inputs', zodInputsRule, {
  valid: [
    // The zod decorators, and the factories they call as plain functions.
    `${nest('Body, Query')}const ZodBody = (s) => Body(s); class C { m(@ZodBody(s) b, @ZodQuery(s) q) {} }`,
    // @Req (webhook raw body), @Res and other decorators stay free.
    `${nest('Req, Res, Headers')}class C { m(@Req() req, @Res({ passthrough: true }) res) {} }`,
    // Not from @nestjs/common: a local helper of the same name.
    'const Body = () => () => {}; class C { m(@Body() b) {} }',
    `import { Body } from './body';\nclass C { m(@Body() b) {} }`,
    // A class, method or property decorator named like an input is not a parameter decorator.
    `${nest('Headers')}class C { @Headers() m() {} }`,
  ],
  invalid: [
    { code: `${nest('Body')}class C { m(@Body() body: unknown) {} }`, errors: [raw('Body', 'ZodBody(schema)')] },
    { code: `${nest('Query')}class C { m(@Query() q) {} }`, errors: [raw('Query', 'ZodQuery(schema)')] },
    {
      code: `${nest('Param, ParseUUIDPipe')}class C { m(@Param('id', ParseUUIDPipe) id: string) {} }`,
      errors: [raw('Param', 'ZodParam(name, schema)')],
    },
    { code: `${nest('Headers')}class C { m(@Headers('x') h?: string) {} }`, errors: [raw('Headers', 'ZodHeaders(schema)')] },
    { code: `${nest('Body as B')}class C { m(@B() b) {} }`, errors: [raw('Body', 'ZodBody(schema)')] },
    { code: `${nest('Query')}class C { m(@Query q = {}) {} }`, errors: [raw('Query', 'ZodQuery(schema)')] },
    {
      code: `${nest('Param')}class C { constructor(@Param('a') private readonly a: string) {} }`,
      errors: [raw('Param', 'ZodParam(name, schema)')],
    },
  ],
});
