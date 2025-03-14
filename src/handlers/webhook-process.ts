import { Container } from '../container';
import { InvocationContext } from '@azure/functions';
import { z } from 'zod';
import get from 'lodash/get';

const queueItemSchema = z.object({
  chatId: z.string(),
  message: z.string(),
  threadId: z.string(),
  userId: z.string(),
});

export function makeWebhookProcessHandler(container: Container) {
  return async function webhookProcess(queueItem: unknown, context: InvocationContext): Promise<void> {
    try {
      context.log('Processing update from queue:', queueItem);

      const { chatId, message, threadId, userId } = queueItemSchema.parse(queueItem);

      const user = await container.userService.getUserById(userId);

      try {
        const agentResponse = await container.agentProvider.invoke(
          {
            messages: [
              container.agentProvider.buildChatMessage({
                role: 'user',
                content: message,
              }),
            ],
            user,
          },
          { threadId },
        );

        const replyMessage = agentResponse.messages[agentResponse.messages.length - 1];

        if (!replyMessage) {
          await container.chatProvider.sendMessages({
            chatId,
            messages: [{ text: 'I do not understand what you are saying. 😔' }],
          });

          return;
        }

        await container.chatProvider.sendMessages({
          chatId,
          messages: [{ text: replyMessage.content }],
        });
      } catch (error) {
        const errorMessage = get(error, 'message', 'An error occurred.');

        const agentResponse = await container.agentProvider.invoke(
          {
            messages: [
              container.agentProvider.buildChatMessage({
                role: 'developer',
                content: `The system encountered an error while processing the user's request.
User's message: "${message}".
Error details: "${errorMessage}".
Please provide a clear, concise explanation of the error in plain language that a non-technical user can understand.
Also, suggest what the user might do next, such as trying again later or contacting support if the problem persists.`,
              }),
            ],
            user,
          },
          { threadId },
        );

        const replyMessage = agentResponse.messages[agentResponse.messages.length - 1];

        if (!replyMessage) {
          await container.chatProvider.sendMessages({
            chatId,
            messages: [{ text: 'An error occurred.' }],
          });

          return;
        }

        await container.chatProvider.sendMessages({
          chatId,
          messages: [{ text: replyMessage.content }],
        });
      }
    } catch (error) {
      container.exceptionProvider.captureException(error, 'Failed to process telegram webhook.');

      throw error;
    }
  };
}
