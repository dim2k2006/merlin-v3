import { app } from '@azure/functions';
import defaultContainer from '../container/default-container';
import { makeAliveHandler } from '../handlers/alive';

app.http('alive', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: makeAliveHandler(defaultContainer),
});
