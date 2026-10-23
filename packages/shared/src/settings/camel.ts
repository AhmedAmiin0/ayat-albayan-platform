/** snake_case row key → camelCase PATCH field ('reminder_24h_enabled' → 'reminder24hEnabled'). */
export type CamelKey<S extends string> = S extends `${infer H}_${infer T}` ? `${H}${CamelKey<Capitalize<T>>}` : S;

export const camelKey = <S extends string>(key: S): CamelKey<S> =>
  key.replace(/_(.)/g, (_m, c: string) => c.toUpperCase()) as CamelKey<S>;
