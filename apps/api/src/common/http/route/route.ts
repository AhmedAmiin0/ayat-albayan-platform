import type { RouteList, RouteMethod, RouteSpec } from '@ab/core';
import { applyDecorators, Delete, Get, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSION } from '@/common/auth/decorators';
import { declareReturns } from '@/common/http/returns';

const METHODS: Record<RouteMethod, (path: string) => MethodDecorator> = {
  GET: Get,
  POST: Post,
  PUT: Put,
  PATCH: Patch,
  DELETE: Delete,
};

const ROUTES = new Map<unknown, RouteSpec>();

/** The route object a handler serves, when it was declared with @Route. */
export function routeOf(handler: unknown): RouteSpec | undefined {
  return ROUTES.get(handler);
}

/**
 * A handler's own @Permissions is kept, whatever the decorator order, so it never equals the
 * route's list and the coverage test reports the two sources.
 */
const grant =
  (permissions: RouteList): MethodDecorator =>
  (_target, _key, { value }) => {
    if (typeof value !== 'function' || Reflect.hasOwnMetadata(PERMISSION, value)) return;
    Reflect.defineMetadata(PERMISSION, permissions, value);
  };

const accessOf = ({ permissions, tags }: RouteSpec): MethodDecorator[] => [
  ...[permissions].flatMap((list) => (list === undefined ? [] : [grant(list)])),
  ...[tags].flatMap((list) => (list === undefined ? [] : [ApiTags(...list)])),
];

/**
 * Serves a shared route object (docs/62 part 3 §2): its method and full path, under a
 * `@Controller()` without a prefix, its permissions (any one lets a caller in) and its Swagger
 * tags, and its JSON answer as @Returns does. Guards, throttles, @Public, @SignedIn and
 * @HttpCode stay on the handler.
 */
export function Route(route: RouteSpec): MethodDecorator {
  const remember: MethodDecorator = (_target, _key, descriptor) => {
    ROUTES.set(descriptor.value, route);
    declareReturns(descriptor.value, route.response);
  };
  return applyDecorators(METHODS[route.method](route.path), ...accessOf(route), remember);
}
