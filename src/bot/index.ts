import { Bot, Context, NextFunction } from 'grammy';
import get from 'lodash/get';
import { Container } from '../container';

function buildBot(container: Container) {
  const bot = new Bot(container.config.telegramBotToken);

  bot.command('start', auth, async (ctx) => {
    const externalId = ctx.from?.id.toString();

    if (!externalId) {
      await ctx.reply('I failed to identify you. Please try again.');

      return;
    }

    const isUserExist = await container.userService.isUserExist(externalId);

    if (!isUserExist) {
      await ctx.reply('Please register first using /register command');

      return;
    }

    const user = await container.userService.getUserByIdOrExternalId(externalId);

    await ctx.reply(`Hello, ${user.firstName}! Welcome to Merlin! 🧙‍♂️`);
  });

  bot.command('register', auth, async (ctx) => {
    const externalId = ctx.from?.id.toString();

    if (!externalId) {
      await ctx.reply('I failed to identify you. Please try again.');

      return;
    }

    const isUserExist = await container.userService.isUserExist(externalId);

    if (isUserExist) {
      await ctx.reply('You are already registered!');

      return;
    }

    const firstName = ctx.from?.first_name ?? '';
    const lastName = ctx.from?.last_name ?? '';

    await container.userService.createUser({ externalId, firstName, lastName });

    await ctx.reply('You have been successfully registered!');
  });

  bot.command('parameters', auth, async (ctx) => {
    const externalId = ctx.from?.id.toString();

    if (!externalId) {
      await ctx.reply('I failed to identify you. Please try again.');

      return;
    }

    const isUserExist = await container.userService.isUserExist(externalId);

    if (!isUserExist) {
      await ctx.reply('Please register first using /register command');

      return;
    }

    const user = await container.userService.getUserByIdOrExternalId(externalId);

    const parameterUser = await container.parameterProvider.getUserByExternalId(user.id);

    const webAppUrl = `${container.config.correlateWebAppUrl}?userId=${parameterUser.id}`;

    await ctx.reply('Click the button below to view your parameters:', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'View Parameters',
              web_app: { url: webAppUrl },
            },
          ],
        ],
      },
    });
  });

  bot.on('message', auth, async (ctx) => {
    const externalId = ctx.from.id.toString();

    const isUserExist = await container.userService.isUserExist(externalId);

    if (!isUserExist) {
      await ctx.reply('Please register first using /register command');

      return;
    }

    const user = await container.userService.getUserByIdOrExternalId(ctx.from.id.toString());

    const message = ctx.message.text;

    if (!message) {
      await ctx.reply('I do not understand what you are saying. 😔');

      return;
    }

    const threadId = ctx.from.id.toString() || 'default-thread';

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

      await ctx.reply(replyMessage.content);
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

      await ctx.reply(replyMessage.content);
    }
  });

  return bot;

  async function auth(ctx: Context, next: NextFunction): Promise<void> {
    if (!ctx.from) {
      await ctx.reply('You are not allowed to use this command.');

      return;
    }

    if (!container.config.allowedTelegramUserIds.includes(ctx.from.id)) {
      await ctx.reply('You are not allowed to use this command.');

      return;
    }

    await next();
  }
}

export default buildBot;
