import * as Sentry from '@sentry/node';
import { ExceptionProvider } from './exception.provider';

type Primitive = number | string | boolean | bigint | symbol | null | undefined;

class ExceptionProviderSentry implements ExceptionProvider {
  captureException(exception: unknown, extraMessage?: string, tags?: Record<string, Primitive>) {
    Sentry.captureException(exception, { tags, extra: { message: extraMessage } });
  }
}

export default ExceptionProviderSentry;
