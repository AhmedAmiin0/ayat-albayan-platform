import type { ErrorRouteComponent, NotFoundRouteComponent, RouteComponent } from '@tanstack/react-router';

export interface RouteErrorWords {
  title: string;
  body: string;
  retry: string;
  home: string;
}

export interface RouteNotFoundWords {
  title: string;
  body: string;
  home: string;
}

export interface RouteStatesOptions<W> {
  words: W;
  /** Where «home» leads: the app's landing page, which sends each person on to their own. */
  home: string;
}

export interface RouteStates {
  defaultPendingComponent: RouteComponent;
  defaultErrorComponent: ErrorRouteComponent;
}

export interface NotFoundState {
  defaultNotFoundComponent: NotFoundRouteComponent;
}
