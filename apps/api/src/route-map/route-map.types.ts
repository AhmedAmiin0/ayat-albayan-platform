export interface ControllerClass {
  name: string;
  prototype: object;
}

/** One served route: its method, full path, controller class and handler. */
export interface RouteHandler {
  method: string;
  path: string;
  cls: ControllerClass;
  name: string;
  handler: object;
}

/** The JSON schemas a route declares for its inputs and its answer. */
export type RouteContract = Partial<Record<'params' | 'query' | 'body' | 'response', unknown>>;
