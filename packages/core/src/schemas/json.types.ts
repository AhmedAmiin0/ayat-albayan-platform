/** Same shape as db's generated `Json`, so rows typed with it assign structurally both ways. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
