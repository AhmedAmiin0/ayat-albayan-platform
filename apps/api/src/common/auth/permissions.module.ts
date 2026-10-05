import { Global, Module } from '@nestjs/common';
import { PermissionResolver } from './permission-resolver';

@Global()
@Module({ providers: [PermissionResolver], exports: [PermissionResolver] })
export class PermissionsModule {}
