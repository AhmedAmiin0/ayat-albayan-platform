import { Module } from '@nestjs/common';
import { RolesController, StaffUsersController } from './roles.controller';
import { RolesRepo } from './roles.repo';
import { RolesService } from './roles.service';
import { ROLE_STORE } from './roles.store';

/** Dynamic roles and permissions (owner, 2026-10-05). PermissionCache comes from AuthModule. */
@Module({
  controllers: [RolesController, StaffUsersController],
  providers: [RolesService, { provide: ROLE_STORE, useClass: RolesRepo }],
  exports: [ROLE_STORE],
})
export class RolesModule {}
