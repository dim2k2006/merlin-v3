import { Container } from '../container';
import { HttpResponseInit } from '@azure/functions';

export function makeDebugSentryHandler(container: Container) {
  return async function debugSentry(): Promise<HttpResponseInit> {
    try {
      throw new Error(`My first Sentry error from ${container.config.cosmosDbName}!`);
    } catch (error) {
      container.exceptionProvider.captureException(error, 'Failed to debug Sentry.');

      throw error;
    }
  };
}
