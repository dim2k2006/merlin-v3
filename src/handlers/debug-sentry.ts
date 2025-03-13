import { Container } from '../container';
import { HttpResponseInit } from '@azure/functions';

export function makeDebugSentryHandler(container: Container) {
  return async function debugSentry(): Promise<HttpResponseInit> {
    throw new Error(`My first Sentry error from ${container.config.cosmosDbName}!`);
  };
}
