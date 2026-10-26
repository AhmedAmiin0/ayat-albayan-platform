import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { badRequest, conflict } from '../../../common/http/errors';
import { dbError } from '../../../common/http/http';
import { USERS_CONFIG, type AuthAdmin, type AuthPatch, type UsersConfig } from '../store/users.store';

/** ~100 years: GoTrue has no "ban forever", and `none` lifts it. */
const BAN_FOREVER = '876000h';

interface AuthFailure {
  code?: string | undefined;
  message: string;
}

/** The Auth Admin API's failures as the module's own codes; anything else is a 500. */
function authError(error: AuthFailure): Error {
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return conflict('email_taken');
  if (error.code === 'weak_password') return badRequest('password_too_short');
  if (error.code === 'validation_failed') return badRequest('invalid_email');
  return new Error(`auth admin: ${error.code ?? 'unknown'}`);
}

/** AuthAdmin on the service-role client: GoTrue's admin endpoints, no SMTP involved. Never logs a secret. */
@Injectable()
export class SupabaseAuthAdmin implements AuthAdmin {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(USERS_CONFIG) private readonly config: UsersConfig,
  ) {}

  async findIdByEmail(email: string): Promise<string | null> {
    const { data, error } = await this.db.rpc('auth_user_id_by_email', { p_email: email });
    if (error) throw dbError(error);
    return data;
  }

  async create(input: { email: string; password?: string; fullName: string }): Promise<string> {
    const { data, error } = await this.db.auth.admin.createUser({
      email: input.email,
      ...(input.password && { password: input.password }),
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });
    if (error) throw authError(error);
    return data.user.id;
  }

  async update(id: string, patch: AuthPatch): Promise<void> {
    const { error } = await this.db.auth.admin.updateUserById(id, {
      ...((patch.email || patch.confirmEmail) && { email_confirm: true }),
      ...(patch.email && { email: patch.email }),
      ...(patch.fullName && { user_metadata: { full_name: patch.fullName } }),
      ...(patch.password && { password: patch.password }),
      ...(patch.banned !== undefined && { ban_duration: patch.banned ? BAN_FOREVER : 'none' }),
    });
    if (error) throw authError(error);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.auth.admin.deleteUser(id);
    if (error) throw authError(error);
  }

  async recoveryLink(email: string): Promise<string> {
    const { data, error } = await this.db.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: this.config.setPasswordUrl },
    });
    if (error) throw authError(error);
    return data.properties.action_link;
  }

  async revokeSessions(id: string): Promise<void> {
    const { error } = await this.db.rpc('revoke_user_sessions', { p_user: id });
    if (error) throw dbError(error);
  }
}
