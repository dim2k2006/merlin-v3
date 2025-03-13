import { Container } from '../container';
import { HttpResponseInit, HttpRequest } from '@azure/functions';
import { webhookCallback } from 'grammy';
import buildBot from '../bot';

export function makeWebhookHandler(container: Container) {
  return async function webhook(request: HttpRequest): Promise<HttpResponseInit> {
    try {
      const bot = buildBot(container);

      const handleUpdate = webhookCallback(bot, 'azure');

      return await new Promise<HttpResponseInit>((resolve, reject) => {
        const replyAdapter = {
          res: {
            status: 200,
            body: '',
            send: (data: unknown) => {
              resolve({ body: data as HttpResponseInit['body'] });
            },
          },
        };

        handleUpdate(request, replyAdapter).catch(reject);
      });
    } catch (error) {
      container.exceptionProvider.captureException(error, 'Failed to process telegram webhook.');

      throw error;
    }
  };
}
