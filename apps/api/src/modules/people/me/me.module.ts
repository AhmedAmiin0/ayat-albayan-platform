import { Module } from '@nestjs/common';
import { loadEnv } from '../../../config/env/env';
import { SupabaseAccountAuth } from './account/account.auth';
import { AccountAvatarService } from './account/account.avatar.service';
import { AccountController } from './account/account.controller';
import { StorageAccountFiles } from './account/account.files';
import { ACCOUNT_AUTH, ACCOUNT_CONFIG, ACCOUNT_FILES, ACCOUNT_STORE, type AccountConfig } from './account/account.ports';
import { AccountPorts } from './account/account.ports.provider';
import { AccountQueries } from './account/account.queries';
import { AccountService } from './account/account.service';
import { MeController } from './me.controller';
import { MeService } from './me.service';

/** The caller's own settings: push tokens (R-MOB-01) and «حسابي» (R-ACC-01..05). */
@Module({
  controllers: [MeController, AccountController],
  providers: [
    MeService,
    AccountService,
    AccountAvatarService,
    AccountPorts,
    { provide: ACCOUNT_STORE, useClass: AccountQueries },
    { provide: ACCOUNT_AUTH, useClass: SupabaseAccountAuth },
    { provide: ACCOUNT_FILES, useClass: StorageAccountFiles },
    {
      provide: ACCOUNT_CONFIG,
      useFactory: (): AccountConfig => {
        const env = loadEnv();
        return {
          passwordMinLength: env.AUTH_PASSWORD_MIN_LENGTH,
          supabaseUrl: env.SUPABASE_URL,
          signInKey: env.SUPABASE_ANON_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY,
        };
      },
    },
  ],
})
export class MeModule {}
