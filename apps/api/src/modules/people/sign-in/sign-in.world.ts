import type { AcademySettings } from '@ab/shared';
import { Provisioner } from './accounts/provision';
import { CodeIssuer } from './codes/code-issuer';
import { SignInLimits } from './codes/code-limits';
import { MemoryLimitStore } from './codes/limit-store';
import { FamilyCodeService } from './flows/family-code.service';
import { PasswordService } from './flows/password.service';
import { SignInAccounts } from './flows/sign-in.accounts';
import { SignInKit } from './flows/sign-in.kit';
import { PasswordTargets } from './flows/targets';
import { FakeAudit, FakeCodes, FakeCodeSend, fakeSettings } from './sign-in.fakes';
import { FakeAuth, FakeSubjects } from './sign-in.fakes.accounts';

/** The sign-in services wired on the in-memory fakes, as SignInModule wires them on Supabase. */
interface WorldOptions {
  settings?: Partial<AcademySettings>;
  pepper?: string | null;
}

export function signInWorld(opts: WorldOptions = {}) {
  const codes = new FakeCodes();
  const send = new FakeCodeSend();
  const audit = new FakeAudit();
  const subjects = new FakeSubjects();
  const auth = new FakeAuth();
  const settings = fakeSettings(opts.settings, opts.pepper === undefined ? undefined : opts.pepper);
  const limitStore = new MemoryLimitStore();
  const limits = new SignInLimits(limitStore);
  const issuer = new CodeIssuer(codes, send.asPort(), settings, limits);
  const kit = new SignInKit(issuer, limits, audit.asPort());
  const provision = new Provisioner(subjects, auth, audit.asPort());
  const accounts = new SignInAccounts(subjects, auth, provision);
  const family = new FamilyCodeService(kit, accounts);
  const passwords = new PasswordService(kit, accounts, new PasswordTargets(subjects, auth));
  return { codes, send, audit, subjects, auth, kit, family, passwords, limitStore };
}
