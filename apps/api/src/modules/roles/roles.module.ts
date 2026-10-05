import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesQueries } from './roles.queries';
import { RolesService } from './roles.service';

@Module({ controllers: [RolesController], providers: [RolesService, RolesQueries] })
export class RolesModule {}
