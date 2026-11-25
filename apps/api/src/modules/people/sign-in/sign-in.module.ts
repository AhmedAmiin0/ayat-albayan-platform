import { Global, Module } from '@nestjs/common';
import { REPORT_CODES } from '@/common/http/report-codes';
import { SHORT_LINK_CODES } from '@/common/http/short-link-codes';
import { loadEnv } from '@/config/env/env';
import { SupabaseAuthGate } from './accounts/auth-gate.supabase';
import { Provisioner } from './accounts/provision';
import { StudentLogins } from './accounts/student-login';
import { SubjectsRepo } from './accounts/subjects.repo';
import { CodeIssuer } from './codes/code-issuer';
import { ReportCodesAdapter } from './codes/report-codes.adapter';
import { ShortLinkCodesAdapter } from './codes/short-link-codes.adapter';
import { SignInLimits } from './codes/code-limits';
import { CodesRepo } from './codes/codes.repo';
import { LIMIT_STORE } from './codes/limit-store';
import { DbLimitStore } from './codes/limit-store.db';
import { FamilyCodeService } from './flows/family-code.service';
import { PasswordService } from './flows/password.service';
import { SignInAccounts } from './flows/sign-in.accounts';
import { SignInKit } from './flows/sign-in.kit';
import { PasswordTargets } from './flows/targets';
import { TeacherCodeService } from './flows/teacher-code.service';
import { SignInController } from './sign-in.controller';
import {
  AUTH_GATE,
  CODE_STORE,
  SIGN_IN_CONFIG,
  SUBJECT_STORE,
  type SignInConfig,
} from './sign-in.ports';
import { SignInSettings } from './sign-in.settings';

/**
 * Family accounts (docs/30): WhatsApp-code sign-in for families, username
 * sign-in, forgot password for everyone. CodeSend comes from the global WhatsappModule,
 * AuditService and SettingsService from their global modules.
 */
@Global()
@Module({
  controllers: [SignInController],
  providers: [
    FamilyCodeService,
    TeacherCodeService,
    PasswordService,
    PasswordTargets,
    SignInKit,
    SignInAccounts,
    CodeIssuer,
    SignInLimits,
    Provisioner,
    StudentLogins,
    SignInSettings,
    ReportCodesAdapter,
    { provide: REPORT_CODES, useExisting: ReportCodesAdapter },
    ShortLinkCodesAdapter,
    { provide: SHORT_LINK_CODES, useExisting: ShortLinkCodesAdapter },
    { provide: CODE_STORE, useClass: CodesRepo },
    { provide: LIMIT_STORE, useClass: DbLimitStore },
    { provide: SUBJECT_STORE, useClass: SubjectsRepo },
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
  // Global: the report page's and short links' codes through their ports, no module import.
  exports: [REPORT_CODES, SHORT_LINK_CODES],
})
export class SignInModule {}
