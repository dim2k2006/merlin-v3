import { app } from '@azure/functions';
import defaultContainer, { config } from '../container/default-container';
import { makeWebhookProcessHandler } from '../handlers/webhook-process';

app.storageQueue('webhook-process', {
  queueName: config.queueName,
  connection: 'AZURE_STORAGE_CONNECTION_STRING',
  handler: makeWebhookProcessHandler(defaultContainer),
});
