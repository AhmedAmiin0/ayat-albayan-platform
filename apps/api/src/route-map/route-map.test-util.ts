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
import type { ControllerClass, RouteHandler } from './route-map.types';

type Target = object;

const methodSchema = z.enum(RequestMethod);
const pathsSchema = z.union([z.string(), z.array(z.string())]).default('');
const guardsSchema = z.array(z.unknown()).default([]);
const flagSchema = z.boolean().default(false);
const textSchema = z.union([z.string(), z.number()]).optional();
const permissionSchema = z.union([z.string(), z.array(z.string())]).optional();

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

/** What the AuthGuard reads: public, signed-in, the permissions (`a|b`: any one of them). */
function authOf(targets: Target[]): string {
  const access = [
    override(flagSchema, IS_PUBLIC, targets) ? 'public' : '',
    override(flagSchema, SIGNED_IN, targets) ? 'signed-in' : '',
    [override(permissionSchema, PERMISSION, targets) ?? []].flat().join('|'),
  ].filter((s) => s !== '');
  return access.join('+') || '-';
}

function accessOf(targets: Target[]): string {
  const code = meta(textSchema, HTTP_CODE_METADATA, targets[0] ?? {}) ?? '-';
  return `access=${authOf(targets)} guards=${guardsOf(targets)} code=${code}`;
}

export function handlersOf(cls: ControllerClass): RouteHandler[] {
  const proto = cls.prototype;
  const bases = pathsOf(cls);
  return new MetadataScanner().getAllMethodNames(proto).flatMap((name) => {
    const handler: unknown = Reflect.get(proto, name);
    if (typeof handler !== 'function' || !Reflect.hasMetadata(METHOD_METADATA, handler)) return [];
    const method = RequestMethod[meta(methodSchema, METHOD_METADATA, handler)];
    const paths = bases.flatMap((b) => pathsOf(handler).map((s) => join(b, s)));
    return paths.map((path) => ({ method, path, cls, name, handler }));
  });
}

const lineOf = ({ method, path, cls, name, handler }: RouteHandler): string =>
  `${method} ${path} ${accessOf([handler, cls])} ${cls.name}.${name}`;

/** Every controller class AppModule registers. Compiles the module graph without starting it. */
export async function appControllers(): Promise<ControllerClass[]> {
  const mod = await Test.createTestingModule({ imports: [AppModule, DiscoveryModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
    .compile();
  const classes = mod.get(DiscoveryService).getControllers().flatMap((wrapper) => {
    const cls: unknown = wrapper.metatype;
    return typeof cls === 'function' ? [cls] : [];
  });
  await mod.close();
  return classes;
}

/** One line per route of these controllers, sorted. */
export function routeLines(classes: ControllerClass[]): string[] {
  return classes.flatMap(handlersOf).map(lineOf).sort();
}

/**
 * Every route of AppModule as one line, sorted: METHOD path, the auth metadata, the route's own
 * guards, its @HttpCode and Controller.handler.
 */
export async function routeMap(): Promise<string[]> {
  return routeLines(await appControllers());
}
