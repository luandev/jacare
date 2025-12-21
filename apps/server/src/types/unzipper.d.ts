declare module "unzipper" {
  import { Writable } from "stream";
  export type ExtractOptions = { path: string };
  export function Extract(options: ExtractOptions): Writable;
}