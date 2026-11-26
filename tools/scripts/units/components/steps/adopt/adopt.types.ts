/** Where `use<Name>` comes from and who else reads that file (docs/63 §2 «same-name hooks»). */
export interface AdoptInput {
  /** Repo path of `Name/Name.tsx`. */
  path: string;
  text: string;
  name: string;
  /** File names in the component's folder. */
  folder: readonly string[];
  read: (path: string) => string;
  /** The repo file `spec` in `from` points at, or undefined for packages and unknown paths. */
  resolve: (from: string, spec: string) => string | undefined;
  /** The specifier `from` writes for `file`: relative, or the app alias instead of `../`. */
  specFor: (from: string, file: string) => string;
  /** Every file that imports `path`. */
  users: (path: string) => string[];
}

export type AdoptVerdict =
  | { result: 'adopted'; files: Record<string, string>; deleted: string[] }
  | { result: 'none' }
  | { result: 'refused'; why: string };
