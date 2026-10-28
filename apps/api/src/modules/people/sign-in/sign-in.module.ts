import { Module } from '@nestjs/common';
import { loadEnv } from '../../../config/env/env';
import { SupabaseAuthGate } from './accounts/auth-gate.supabase';
import { Provisioner } from './accounts/provision';
import { SubjectsQueries } from './accounts/subjects.queries';
import { CodeIssuer } from './codes/code-issuer';
import { SignInLimits } from './codes/code-limits';
import { CodesQueries } from './codes/codes.queries';
import { LIMIT_STORE } from './codes/limit-store';
import { DbLimitStore } from './codes/limit-store.db';
import { FamilyCodeService } from './flows/family-code.service';
import { PasswordService } from './flows/password.service';
import { AccountKit, SignInKit } from './flows/sign-in.kit';
import { PasswordTargets } from './flows/targets';
import { SignInController } from './sign-in.controller';
import { AUTH_GATE, CODE_STORE, SIGN_IN_CONFIG, SUBJECT_STORE, type SignInConfig } from './sign-in.ports';
import { SignInSettings } from './sign-in.settings';

/**
 * Family accounts (owner 2026-10-27, docs/30): WhatsApp-code sign-in for families, username sign-in,
 * forgot password for everyone. CodeSend comes from the global WhatsappModule, AuditService and
 * SettingsService from their global modules.
 */
@Module({
  controllers: [SignInController],
  providers: [
    FamilyCodeService,
    PasswordService,
    PasswordTargets,
    SignInKit,
    AccountKit,
    CodeIssuer,
    SignInLimits,
    Provisioner,
    SignInSettings,
    { provide: CODE_STORE, useClass: CodesQueries },
    { provide: LIMIT_STORE, useClass: DbLimitStore },
    { provide: SUBJECT_STORE, useClass: SubjectsQueries },
    { provide: AUTH_GATE, useClass: SupabaseAuthGate },
    {
      provide: SIGN_IN_CONFIG,
      useFactory: (): SignInConfig => {
        const env = loadEnv();
        return {
          pepper: env.LOGIN_CODE_PEPPER ?? null,
          passwordMinLength: env.AUTH_PASSWORD_MIN_LENGTH,
          supabaseUrl: env.SUPABASE_URL,
          signInKey: env.SUPABASE_ANON_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY,
        };
      },
    },
  ],
})
export class SignInModule {}
