export interface HelpersInput {
  /** Repo path of `Name/Name.tsx`. */
  path: string;
  text: string;
  name: string;
  /** Other files of the folder (tests, index.ts): path → text. */
  files: Readonly<Record<string, string>>;
  /** Files outside the folder that import `Name.tsx` by path, and the names they take. */
  outside: readonly { file: string; names: readonly string[] }[];
}

export type HelpersVerdict =
  | { result: 'helpers'; files: Record<string, string> }
  | { result: 'none' }
  | { result: 'refused'; why: string };
