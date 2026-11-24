import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService, MetadataScanner } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { z } from 'zod';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver } from '@/common/auth/auth.guard';
import { IS_PUBLIC, PERMISSION, SIGNED_IN } from '@/common/auth/decorators';

type Target = object;

const methodSchema = z.enum(RequestMethod);
const pathsSchema = z.union([z.string(), z.array(z.string())]).default('');
const guardsSchema = z.array(z.unknown()).default([]);
const flagSchema = z.boolean().default(false);
const textSchema = z.union([z.string(), z.number()]).optional();

const meta = <T extends z.ZodType>(schema: T, key: string, target: Target): z.output<T> =>
  schema.parse(Reflect.getMetadata(key, target));

/** The handler's own value, else the controller's (Reflector.getAllAndOverride). */
const override = <T extends z.ZodType>(schema: T, key: string, targets: Target[]): z.output<T> => {
  const values = targets.map((t): unknown => Reflect.getMetadata(key, t));
  return schema.parse(values.find((v) => v !== undefined));
};

const pathsOf = (target: Target): string[] => [meta(pathsSchema, PATH_METADATA, target)].flat();

const join = (base: string, sub: string): string =>
  `/${base}/${sub}`.replace(/\/+/g, '/').replace(/(.)\/$/, '$1');

const nameOf = (guard: unknown): string => (typeof guard === 'function' ? guard.name : 'instance');

function guardsOf(targets: Target[]): string {
  const all = targets.toReversed().flatMap((t) => meta(guardsSchema, GUARDS_METADATA, t));
  return all.length === 0 ? '-' : all.map(nameOf).join(',');
}

/** What the AuthGuard reads: public, signed-in, the one permission. */
function authOf(targets: Target[]): string {
  const access = [
    override(flagSchema, IS_PUBLIC, targets) ? 'public' : '',
    override(flagSchema, SIGNED_IN, targets) ? 'signed-in' : '',
    override(textSchema, PERMISSION, targets) ?? '',
  ].filter((s) => s !== '');
  return access.join('+') || '-';
}

function accessOf(targets: Target[]): string {
  const code = meta(textSchema, HTTP_CODE_METADATA, targets[0] ?? {}) ?? '-';
  return `access=${authOf(targets)} guards=${guardsOf(targets)} code=${code}`;
}

function linesOf(cls: { name: string; prototype: object }): string[] {
  const proto = cls.prototype;
  const bases = pathsOf(cls);
  return new MetadataScanner().getAllMethodNames(proto).flatMap((name) => {
    const handler: unknown = Reflect.get(proto, name);
    if (typeof handler !== 'function' || !Reflect.hasMetadata(METHOD_METADATA, handler)) return [];
    const method = RequestMethod[meta(methodSchema, METHOD_METADATA, handler)];
    const tail = `${accessOf([handler, cls])} ${cls.name}.${name}`;
    return bases.flatMap((b) => pathsOf(handler).map((s) => `${method} ${join(b, s)} ${tail}`));
  });
}

/**
 * Every route of AppModule as one line, sorted: METHOD path, the auth metadata, the route's own
 * guards, its @HttpCode and Controller.handler. Compiles the module graph without starting the app.
 */
export async function routeMap(): Promise<string[]> {
  const mod = await Test.createTestingModule({ imports: [AppModule, DiscoveryModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
    .compile();
  const lines = mod.get(DiscoveryService).getControllers().flatMap((wrapper) => {
    const cls: unknown = wrapper.metatype;
    return typeof cls === 'function' ? linesOf(cls) : [];
  });
  await mod.close();
  return lines.sort();
}
