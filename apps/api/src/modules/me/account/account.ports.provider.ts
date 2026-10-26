import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_AUTH,
  ACCOUNT_FILES,
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
    @Inject(ACCOUNT_FILES) readonly files: AccountFiles,
  ) {}
}
