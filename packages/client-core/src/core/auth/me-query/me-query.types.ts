export interface MeQuery {
  queryKey: string[];
  /** The body stays unknown: each reader parses the fields it needs with its own schema. */
  queryFn: () => Promise<unknown>;
}
