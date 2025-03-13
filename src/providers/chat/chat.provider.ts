export interface ChatProvider {
  sendMessages(input: SendMessagesInput): Promise<void>;
  sendPhotos(input: SendPhotosInput): Promise<void>;
}

export type SendMessagesInput = {
  chatId: string;
  messages: Message[];
};

export type Message = {
  text: string;
  replyMarkup?: ReplyMarkupItem[];
};

export type SendPhotosInput = {
  chatId: string;
  photos: Photo[];
  replyMarkup?: ReplyMarkupItem[];
};

export type Photo = {
  url: string;
  caption?: string;
};

type ReplyMarkupItem = {
  text: string;
  url: string;
}[];
