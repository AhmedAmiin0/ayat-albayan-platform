export interface FoldIo {
  root: string;
  cwd: string;
  log: (line: string) => void;
}
