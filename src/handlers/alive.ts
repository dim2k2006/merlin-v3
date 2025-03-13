import { Container } from '../container';
import { HttpResponseInit } from '@azure/functions';

export function makeAliveHandler(container: Container) {
  return async function alive(): Promise<HttpResponseInit> {
    const date = new Date().toISOString();

    return { body: `It is alive 🔥🔥🔥 Now: ${date} UTC. Db name: ${container.config.cosmosDbName}` };
  };
}
