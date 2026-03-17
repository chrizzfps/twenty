export class PostgresException extends Error {
  readonly code: string;
  readonly originalMessage: string | undefined;
  constructor(message: string, code: string, originalMessage?: string) {
    super(message);
    this.code = code;
    this.originalMessage = originalMessage;
  }
}
