import { Inject, Injectable } from '@nestjs/common';
import { AVATAR_FILES } from '../../../../common/storage/avatars/avatar-files';
import {
  ACCOUNT_AUTH,
  ACCOUNT_STORE,
  type AccountAuth,
  type AccountFiles,
  type AccountStore,
} from './account.ports';

/** The three ports of the account services in one injectable (rule 2: at most 3 parameters). */
@Injectable()
export class AccountPorts {
  constructor(
    @Inject(ACCOUNT_STORE) readonly store: AccountStore,
    @Inject(ACCOUNT_AUTH) readonly auth: AccountAuth,
    @Inject(AVATAR_FILES) readonly files: AccountFiles,
  ) {}
}
