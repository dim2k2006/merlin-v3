import { app } from '@azure/functions';
import defaultContainer from '../container/default-container';
import { makeValidateTelegramHandler } from '../handlers/validate-telegram';

app.http('validate-telegram', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: makeValidateTelegramHandler(defaultContainer),
});
