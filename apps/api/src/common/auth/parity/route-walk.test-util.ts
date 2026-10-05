import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../app.module';
import { PERMISSION_RESOLVER, systemResolver } from '../auth.guard';
import { IS_PUBLIC, PERMISSION, SIGNED_IN } from '../decorators';

/** One controller handler as the AuthGuard sees it. key = 'StudentsController.list'. */
export interface RouteAccess {
  key: string;
  isPublic: boolean;
  signedIn: boolean;
  /** Raw metadata: the coverage test checks it is one catalog key. */
  permission: unknown;
}

/** 'public' | 'signed-in' | the roles @Roles admitted, sorted — the table frozen before the change. */
export type BeforeAccess = 'public' | 'signed-in' | string[];

export function accessBefore(): Record<string, BeforeAccess> {
  return JSON.parse(readFileSync(join(__dirname, 'access-before.json'), 'utf8'));
}

function isHandler(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function' && Reflect.getMetadata(METHOD_METADATA, value) !== undefined;
}

/** Boots AppModule (no network) and lists every routed handler of every controller. */
export async function walkRoutes(): Promise<RouteAccess[]> {
  const mod = await Test.createTestingModule({ imports: [AppModule, DiscoveryModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
    .compile();
  const reflector = mod.get(Reflector);
  const scanner = new MetadataScanner();
  const out: RouteAccess[] = [];
  for (const wrapper of mod.get(DiscoveryService).getControllers()) {
    const cls: unknown = wrapper.metatype;
    if (typeof cls !== 'function') continue;
    const proto: object = cls.prototype;
    for (const name of scanner.getAllMethodNames(proto)) {
      const handler: unknown = Reflect.get(proto, name);
      if (!isHandler(handler)) continue;
      const targets = [handler, cls];
      out.push({
        key: `${cls.name}.${name}`,
        isPublic: reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) === true,
        signedIn: reflector.getAllAndOverride<boolean>(SIGNED_IN, targets) === true,
        permission: reflector.getAllAndOverride<unknown>(PERMISSION, targets),
      });
    }
  }
  await mod.close();
  return out;
}
