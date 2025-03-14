import { Container } from '../container';
import { HttpResponseInit, HttpRequest, InvocationContext } from '@azure/functions';
import { webhookCallback } from 'grammy';
import buildBot from '../bot';

export function makeWebhookHandler(container: Container) {
  return async function webhook(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const rawBody = await request.json();

      const bot = buildBot(container);

      const modifiedRequest = {
        ...request,
        body: rawBody,
      };

      const handleUpdate = webhookCallback(bot, 'azure');

      return await new Promise<HttpResponseInit>((resolve, reject) => {
        const replyAdapter = {
          res: {
            status: 200,
            body: '',
            send: (data: unknown) => {
              context.log('data:', data);
              resolve({ body: data as HttpResponseInit['body'] });
            },
          },
        };

        handleUpdate(modifiedRequest, replyAdapter)
          .then(() => resolve({ body: 'ok' }))
          .catch(reject);
      });
    } catch (error) {
      container.exceptionProvider.captureException(error, 'Failed to receive telegram webhook.');

      throw error;
    }
  };
}
