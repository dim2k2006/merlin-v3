import { Container } from '../container';
import { InvocationContext } from '@azure/functions';
import { webhookCallback } from 'grammy';
import buildBot from '../bot';

export function makeWebhookProcessHandler(container: Container) {
  return async function webhookProcess(queueItem: unknown, context: InvocationContext): Promise<void> {
    try {
      context.log('Processing update from queue:', queueItem);

      const bot = buildBot(container);

      const request = {
        body: queueItem,
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
