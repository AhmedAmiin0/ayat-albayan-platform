import { createElement } from 'react';
import { RouteError } from './RouteError';
import { RouteNotFound } from './RouteNotFound';
import { RoutePending } from './RoutePending';
import type {
  NotFoundState,
  RouteErrorWords,
  RouteNotFoundWords,
  RouteStates,
  RouteStatesOptions,
} from './route-states.types';

/** createRouter defaults: never a blank page or the router's English error card. */
export function routeStates(opts: RouteStatesOptions<RouteErrorWords>): RouteStates {
  return {
    defaultPendingComponent: RoutePending,
    defaultErrorComponent: () => createElement(RouteError, opts),
  };
}

export function notFoundState(opts: RouteStatesOptions<RouteNotFoundWords>): NotFoundState {
  return { defaultNotFoundComponent: () => createElement(RouteNotFound, opts) };
}
