import { Container } from '../container';
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export function makeAliveHandler(container: Container) {
  return async function alive(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const name = request.query.get('name') || (await request.text()) || 'world';

    // You can use the container here if needed, e.g., container.resolve('service')

    return { body: `Hello, ${name}! ${container.config.cosmosDbName}` };
  };
}
