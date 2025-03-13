import axios, { AxiosInstance } from 'axios';
import random from 'lodash/random';
import { ChatProvider, SendPhotosInput, SendMessagesInput, Message } from './chat.provider';
import { handleAxiosError } from '../../utils/axios';

type ConstructorInput = {
  botToken: string;
};

class ChatProviderTelegram implements ChatProvider {
  private readonly client: AxiosInstance;

  private readonly baseUrl: string;

  private readonly botToken: string;

  constructor({ botToken }: ConstructorInput) {
    const baseURL = 'https://api.telegram.org';

    this.baseUrl = baseURL;

    this.botToken = botToken;

    this.client = axios.create({
      baseURL,
    });
  }

  async sendMessages({ chatId, messages }: SendMessagesInput) {
    const iter = async (messagesList: Message[]): Promise<void> => {
      if (messagesList.length === 0) {
        return;
      }

      const message = messagesList[0];

      if (!message) {
        return iter(messagesList.slice(1));
      }

      await this.sendMessage(chatId, message);

      await this.sleep(random(1000, 3000));

      return iter(messagesList.slice(1));
    };

    await iter(messages);
  }

  async sendMessage(chatId: string, message: Message): Promise<void> {
    const url = `/bot${this.botToken}/sendMessage`;

    try {
      const replyMarkup = message.replyMarkup ?? [];

      const reply_markup = replyMarkup.length > 0 ? { inline_keyboard: replyMarkup } : undefined;

      await this.client.post(url, {
        chat_id: chatId,
        text: message.text,
        parse_mode: 'html',
        disable_web_page_preview: true,
        reply_markup,
      });
    } catch (error) {
      return handleAxiosError(error, `${this.baseUrl}${url}`);
    }
  }

  async sendPhotos({ chatId, photos, replyMarkup = [] }: SendPhotosInput): Promise<void> {
    const url = `/bot${this.botToken}/sendMediaGroup`;

    try {
      const mediaItems = photos.map((photo) => ({
        type: 'photo',
        media: photo.url,
        caption: photo.caption,
      }));

      await this.client.post(url, {
        chat_id: chatId,
        media: mediaItems,
      });

      if (replyMarkup.length > 0) {
        await this.sendMessages({
          chatId,
          messages: [{ text: 'Выберите действие:', replyMarkup }],
        });
      }
    } catch (error) {
      return handleAxiosError(error, `${this.baseUrl}${url}`);
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default ChatProviderTelegram;
