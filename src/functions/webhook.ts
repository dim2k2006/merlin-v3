import { app } from '@azure/functions';
import defaultContainer from '../container/default-container';
import { makeWebhookHandler } from '../handlers/webhook';

app.http('webhook', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: makeWebhookHandler(defaultContainer),
});
