import { Container } from '../container';
import { InvocationContext } from '@azure/functions';
import { z } from 'zod';
import get from 'lodash/get';

const queueItemSchema = z.object({
  chatId: z.string(),
  message: z.string(),
  threadId: z.string(),
  user: z.object({
    id: z.string(),
    externalId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
});

export function makeWebhookProcessHandler(container: Container) {
  return async function webhookProcess(queueItem: unknown, context: InvocationContext): Promise<void> {
    try {
      context.log('Processing update from queue:', queueItem);

      const { chatId, message, threadId, user } = queueItemSchema.parse(queueItem);

      try {
        const agentResponse = await container.agentProvider.invoke(
          {
            messages: [
              container.agentProvider.buildChatMessage({
                role: 'developer',
                content: `User Info: id=${user.id}, externalId=${user.externalId}, firstName=${user.firstName}, lastName=${user.lastName}.
Please generate a clear, concise answer to the user's query. At the end of your response, add a line "Tools Used:" followed by the names of any tools that were utilized. If no tool was used, output "none". It super puper duper important to attach valid information about tools used! Give it high priority!`,
              }),
              container.agentProvider.buildChatMessage({
                role: 'user',
                content: message,
              }),
            ],
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
User Info: id=${user.id}, externalId=${user.externalId}, firstName=${user.firstName}, lastName=${user.lastName}.
User's message: "${message}".
Error details: "${errorMessage}".
Please provide a clear, concise explanation of the error in plain language that a non-technical user can understand.
Also, suggest what the user might do next, such as trying again later or contacting support if the problem persists.
At the end, add a line "Tools Used:" and list any tools that were involved in handling this request. If no tools were used, output "none".`,
              }),
            ],
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
