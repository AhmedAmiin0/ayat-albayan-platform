import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { Test } from '@nestjs/testing';
import { z } from 'zod';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver } from '@/common/auth/auth.guard';
import { IS_PUBLIC, PERMISSION, SIGNED_IN } from '@/common/auth/decorators';
import { routeOf as routeObjectOf } from '@/common/http/route';

/** One controller handler as the AuthGuard sees it. key = 'StudentsController.list'. */
export interface RouteAccess {
  key: string;
  /** 'GET /students/:id': the controller path joined with the handler path. */
  route: string;
  isPublic: boolean;
  signedIn: boolean;
  /** Raw metadata the guard reads: one catalog key, or the route object's list. */
  permission: unknown;
  /** Each source on its own: the handler's metadata, its class's, the route object's list. */
  handlerPermission: unknown;
  classPermission: unknown;
  routePermissions: readonly string[] | undefined;
  /** Swagger tags of the handler and its class together. */
  tags: string[];
  /** Not hidden from the OpenAPI document by @ApiExcludeController or @ApiExcludeEndpoint. */
  inDocument: boolean;
}

/** 'public' | 'signed-in' | the roles @Roles admitted, sorted — the table frozen before the change. */
export type BeforeAccess = 'public' | 'signed-in' | string[];

export function accessBefore(): Record<string, BeforeAccess> {
  return JSON.parse(readFileSync(join(__dirname, 'access-before.json'), 'utf8'));
}

function pathOf(target: object): string {
  const raw: unknown = Reflect.getMetadata(PATH_METADATA, target);
  const first: unknown = Array.isArray(raw) ? raw[0] : raw;
  return typeof first === 'string' ? first : '';
}

function routeOf(cls: object, handler: object): string {
  const method: unknown = Reflect.getMetadata(METHOD_METADATA, handler);
  const verb = typeof method === 'number' ? (RequestMethod[method] ?? 'GET') : 'GET';
  const parts = [pathOf(cls), pathOf(handler)].flatMap((p) => p.split('/')).filter((p) => p !== '');
  return `${verb} /${parts.join('/')}`;
}

/** The keys the guard accepts, any one of which lets a caller in: one key, a list, or none. */
export const permissionKeys = (route: Pick<RouteAccess, 'permission'>): unknown[] =>
  [route.permission ?? []].flat();

const tagsSchema = z.array(z.string()).default([]);

const classOutSchema = z.tuple([z.boolean()]).optional();
const endpointOutSchema = z.object({ disable: z.boolean() }).optional();

const tagsOf = (targets: object[]): string[] =>
  targets.flatMap((t) => tagsSchema.parse(Reflect.getMetadata(DECORATORS.API_TAGS, t)));

const isClassOut = (cls: object): boolean =>
  classOutSchema.parse(Reflect.getMetadata(DECORATORS.API_EXCLUDE_CONTROLLER, cls))?.[0] === true;

const isEndpointOut = (handler: object): boolean =>
  endpointOutSchema.parse(Reflect.getMetadata(DECORATORS.API_EXCLUDE_ENDPOINT, handler))
    ?.disable === true;

type Target = Parameters<Reflector['getAllAndOverride']>[1][number];

interface Walked {
  cls: Target;
  name: string;
  handler: Target;
}

function accessOf(reflector: Reflector, { cls, name, handler }: Walked): RouteAccess {
  const targets = [handler, cls];
  return {
    key: `${cls.name}.${name}`,
    route: routeOf(cls, handler),
    isPublic: reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) === true,
    signedIn: reflector.getAllAndOverride<boolean>(SIGNED_IN, targets) === true,
    permission: reflector.getAllAndOverride<unknown>(PERMISSION, targets),
    handlerPermission: Reflect.getMetadata(PERMISSION, handler),
    classPermission: Reflect.getMetadata(PERMISSION, cls),
    routePermissions: routeObjectOf(handler)?.permissions,
    tags: tagsOf(targets),
    inDocument: !isClassOut(cls) && !isEndpointOut(handler),
  };
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
      out.push(accessOf(reflector, { cls, name, handler }));
    }
  }
  await mod.close();
  return out;
}
