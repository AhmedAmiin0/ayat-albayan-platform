import {
  signInRoutes as routes,
  type CodeSession,
  type CodeStatus,
  type PasswordSession,
} from '@ab/shared';
import { Controller, HttpCode, Inject, Ip } from '@nestjs/common';
import { Public } from '@/common/auth/decorators';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { FamilyCodeService } from './flows/family-code.service';
import { PasswordService } from './flows/password.service';
import { TeacherCodeService } from './flows/teacher-code.service';
import { SignInSettings } from './sign-in.settings';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * Family accounts (docs/30 §6): public routes, each zod-validated by its packages/shared schema and
 * rate-limited (429 too_many_requests). The code request / forgot routes answer 202 whatever
 * exists.
 */
@Public()
@Controller()
export class SignInController {
  constructor(
    private readonly family: FamilyCodeService,
    private readonly passwords: PasswordService,
    @Inject(TeacherCodeService) private readonly teachers: TeacherCodeService,
    private readonly settings: SignInSettings,
  ) {}

  /**
   * Which sign-in / forgot screens to show: family codes (`available`) and staff codes (`staff`:
   * the teacher's code sign-in and the staff reset, docs/46 A1) can be sent now.
   */
  @Route(routes.status)
  async status(): Promise<CodeStatus> {
    const [available, staff] = await Promise.all([this.family.available(), this.family.staff()]);
    return { available, staff };
  }

  /**
   * A teacher's code (docs/46 A2): 202 whatever exists, the code goes to the phone on file (D2).
   */
  @Route(routes.staffRequest)
  @HttpCode(202)
  staffRequest(@RouteInput() { body }: In<'staffRequest'>, @Ip() ip: string): Promise<void> {
    return this.teachers.request(body, ip);
  }

  @Route(routes.staffVerify)
  @HttpCode(200)
  staffVerify(@RouteInput() { body }: In<'staffVerify'>, @Ip() ip: string): Promise<CodeSession> {
    return this.teachers.verify(body, ip);
  }

  @Route(routes.request)
  @HttpCode(202)
  request(@RouteInput() { body }: In<'request'>, @Ip() ip: string): Promise<void> {
    return this.family.request(body, ip);
  }

  @Route(routes.verify)
  @HttpCode(200)
  verify(@RouteInput() { body }: In<'verify'>, @Ip() ip: string): Promise<CodeSession> {
    return this.family.verify(body, ip);
  }

  @Route(routes.login)
  @HttpCode(200)
  login(@RouteInput() { body }: In<'login'>, @Ip() ip: string): Promise<PasswordSession> {
    return this.passwords.login(body, ip);
  }

  @Route(routes.forgot)
  @HttpCode(202)
  forgot(@RouteInput() { body }: In<'forgot'>, @Ip() ip: string): Promise<void> {
    return this.passwords.forgot(body, ip);
  }

  @Route(routes.reset)
  @HttpCode(204)
  async reset(@RouteInput() { body }: In<'reset'>, @Ip() ip: string): Promise<void> {
    await this.passwords.reset(body, ip, this.settings.config.passwordMinLength);
  }
}
