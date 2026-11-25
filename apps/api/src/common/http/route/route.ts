import type { RouteMethod, RouteSpec } from '@ab/core';
import { applyDecorators, Delete, Get, Patch, Post, Put } from '@nestjs/common';

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
 * Serves a shared route object (docs/62 part 3 §2): its method and full path, under a
 * `@Controller()` without a prefix. Permissions, guards and @HttpCode stay on the handler.
 */
export function Route(route: RouteSpec): MethodDecorator {
  const remember: MethodDecorator = (_target, _key, descriptor) => {
    ROUTES.set(descriptor.value, route);
  };
  return applyDecorators(METHODS[route.method](route.path), remember);
}
