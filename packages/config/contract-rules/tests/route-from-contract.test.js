import { testRule } from '../../rule-testers.js';
import { routeFromContractRule } from '../index.js';

const verb = (name) => ({ messageId: 'verb', data: { name } });
const nest = (names) => `import { ${names} } from '@nestjs/common';\n`;
const CONTROLLER = '/repo/apps/api/src/modules/sales/leads/leads.controller.ts';
const inController = (code) => ({ code, filename: CONTROLLER });

testRule({ name: 'route-from-contract', rule: routeFromContractRule, lang: 'ts' }, {
  valid: [
    inController(`${nest('Controller')}@Controller() class C { @Route(r.list) list() {} }`),
    inController(`${nest('HttpCode')}class C { @Route(r.remove) @HttpCode(204) remove() {} }`),
    // Not from @nestjs/common: a local decorator of the same name.
    inController('const Get = () => () => {}; class C { @Get() list() {} }'),
    inController(`import { Get } from './get';\nclass C { @Get('x') list() {} }`),
    // Outside a controller file the rule does not look.
    {
      code: `${nest('Get')}class C { @Get('ping') ping() {} }`,
      filename: '/repo/apps/api/src/common/http/route/tests/route.test.ts',
    },
  ],
  invalid: [
    inController(`${nest('Get')}class C { @Get(':id') one() {} }`),
    inController(`${nest('Post')}class C { @Post('leads') create() {} }`),
    inController(`${nest('Put')}class C { @Put() put() {} }`),
    inController(`${nest('Patch as P')}class C { @P(':id') edit() {} }`),
    inController(`${nest('Delete')}class C { @Delete(':id') remove() {} }`),
    inController(`import * as N from '@nestjs/common';\nclass C { @N.Get('x') list() {} }`),
  ].map((one, index) => ({
    ...one,
    errors: [verb(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Get'][index])],
  })),
});
