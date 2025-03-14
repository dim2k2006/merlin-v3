import { TextCleanerProvider } from './textCleaner.provider';
import { LlmProvider } from '../../shared/llm.types';

type ConstructorInput = {
  llmProvider: LlmProvider;
};

class TextCleanerProviderLlm implements TextCleanerProvider {
  private llmProvider: LlmProvider;

  constructor({ llmProvider }: ConstructorInput) {
    this.llmProvider = llmProvider;
  }

  async extractMemoryText(text: string): Promise<string> {
    const messages = [
      this.llmProvider.buildChatMessage({
        role: 'developer',
        content: `
You are a text-cleaning assistant.
The user will give you a phrase that might contain filler words like "запомни", "please remember", or "помни".
Your task:
1) remove these filler words,
2) return only the essential statement,
3) no explanations, no extra text – only the cleaned statement.
        `,
      }),
      this.llmProvider.buildChatMessage({ role: 'user', content: text }),
    ];

    const completion = await this.llmProvider.createChatCompletion({ messages });
    return completion.content.trim();
  }

  async extractSearchQuery(text: string): Promise<string> {
    const messages = [
      this.llmProvider.buildChatMessage({
        role: 'developer',
        content: `
You are a query-cleaning assistant.
The user will provide a search request that might contain filler words like "покажи", "найди", "where did I mention", or "retrieve".
Your task:
1) remove these filler words or meta instructions,
2) return only the essential query keywords,
3) do not add any extra text or explanations.
        `,
      }),
      this.llmProvider.buildChatMessage({ role: 'user', content: text }),
    ];

    const completion = await this.llmProvider.createChatCompletion({ messages });
    return completion.content.trim();
  }
}

export default TextCleanerProviderLlm;
