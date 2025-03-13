import { Container } from '../container';
import { InvocationContext } from '@azure/functions';
import { webhookCallback } from 'grammy';
import buildBot from '../bot';

export function makeWebhookProcessHandler(container: Container) {
  return async function webhookProcess(queueItem: unknown, context: InvocationContext): Promise<void> {
    try {
      const message = queueItem as string;

      const decoded = Buffer.from(message, 'base64').toString('utf8');

      const update = JSON.parse(decoded);

      context.log('Processing update from queue:', update);

      const bot = buildBot(container);

      const request = {
        body: update,
      };

      const replyAdapter = {
        res: {
          status: 200,
          body: '',
          send: (data: unknown) => {
            context.log('Queue handler reply:', data);
          },
        },
      };

      const handleUpdate = webhookCallback(bot, 'azure');

      await handleUpdate(request, replyAdapter);
    } catch (error) {
      container.exceptionProvider.captureException(error, 'Failed to process telegram webhook.');

      throw error;
    }
  };
}
