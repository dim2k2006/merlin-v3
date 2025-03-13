import { QueueClient } from '@azure/storage-queue';
import { QueueProvider } from './queue.provider';

type ConstructorInput = {
  client: QueueClient;
};

class QueueProviderAzure implements QueueProvider {
  private client: QueueClient;

  constructor({ client }: ConstructorInput) {
    this.client = client;
  }

  async sendMessage(message: string): Promise<void> {
    const base64Message = Buffer.from(message).toString('base64');

    await this.client.sendMessage(base64Message);
  }
}

export default QueueProviderAzure;
