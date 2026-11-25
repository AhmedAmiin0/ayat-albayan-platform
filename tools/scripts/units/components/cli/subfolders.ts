/** Names of the folders directly under `dir` that hold a tracked file. */
export const subfoldersOf = (paths: readonly string[], dir: string): string[] => [
  ...new Set(
    paths
      .filter((p) => p.startsWith(`${dir}/`))
      .map((p) => p.slice(dir.length + 1).split('/'))
      .filter((parts) => parts.length > 1)
      .map((parts) => parts[0] ?? ''),
  ),
];
