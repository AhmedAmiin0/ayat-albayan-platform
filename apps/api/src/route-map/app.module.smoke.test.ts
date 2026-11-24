import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver } from '@/common/auth/auth.guard';
import { SalesMoneyModule } from '@/modules/sales/sales-money';

// The one AppModule boot that only checks wiring: every provider of every module resolves.
describe('AppModule dependency graph', () => {
  it('compiles with every module and provider resolved', async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .compile();
    expect(mod.get(SalesMoneyModule)).toBeInstanceOf(SalesMoneyModule);
    await mod.close();
  }, 60_000);
});
