import { app } from '@azure/functions';
import defaultContainer from '../container/default-container';
import { makeDebugSentryHandler } from '../handlers/debug-sentry';

app.http('debug-sentry', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: makeDebugSentryHandler(defaultContainer),
});
