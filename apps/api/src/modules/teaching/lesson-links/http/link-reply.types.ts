/** What the controllers need of Fastify's reply (passthrough: Nest still sends the body). */
export interface LinkReply {
  status(code: number): unknown;
  header(name: string, value: string): unknown;
}
