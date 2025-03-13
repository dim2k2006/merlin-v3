export interface ExceptionProvider {
  captureException(exception: unknown, extraMessage?: string, tags?: Record<string, string | number>): void;
}
