import { Container } from '../container';
import { HttpResponseInit, HttpRequest } from '@azure/functions';

export function makeWebhookHandler(container: Container) {
  return async function webhook(request: HttpRequest): Promise<HttpResponseInit> {
    try {
      const rawBody = await request.json();

      await container.queueProvider.sendMessage(JSON.stringify(rawBody));

      return { status: 200, body: 'accepted' };
    } catch (error) {
      container.exceptionProvider.captureException(error, 'Failed to receive telegram webhook.');

      throw error;
    }
  };
}
