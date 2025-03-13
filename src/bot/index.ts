import { Bot, Context, NextFunction } from 'grammy';
import get from 'lodash/get';
import toString from 'lodash/toString';
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

    const chatId = ctx.chatId;

    await container.queueProvider.sendMessage(JSON.stringify({ chatId: toString(chatId), message, threadId, user }));

    await ctx.react('👀');
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
