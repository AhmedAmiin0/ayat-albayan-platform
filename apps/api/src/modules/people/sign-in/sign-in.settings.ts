import type { SettingKey } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';
import { SIGN_IN_CONFIG, type SignInConfig } from './sign-in.ports';

const KEYS = ['family_login_enabled', 'login_code_ttl_minutes', 'login_code_max_attempts'] as const satisfies readonly SettingKey[];
type SignInSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings and the env config the sign-in module reads (common/settings/settings-slice.ts). */
@Injectable()
export class SignInSettings {
  constructor(
    private readonly store: SettingsService,
    @Inject(SIGN_IN_CONFIG) readonly config: SignInConfig,
  ) {}

  read(): Promise<SignInSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
