import { Global, Module } from '@nestjs/common';
import { ClientUsageService } from './client-usage.service';

/** X-AB-Client usage counting (docs/26 §2f); the Fastify hook is registered from main.ts (client-usage.hook.ts). */
@Global()
@Module({ providers: [ClientUsageService], exports: [ClientUsageService] })
export class ClientUsageModule {}
