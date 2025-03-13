export interface QueueProvider {
  sendMessage(message: string): Promise<void>;
}
