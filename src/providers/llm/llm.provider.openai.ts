import OpenAI from 'openai';
import {
  LlmProvider,
  CreateChatCompletionInput,
  ChatCompletion,
  BuildChatMessageInput,
  ChatMessage,
  IdentifyIntentInput,
  Intent,
} from './llm.provider';

type ConstructorInput = {
  apiKey: string;
};

class LlmProviderOpenai implements LlmProvider {
  private openai: OpenAI;

  constructor({ apiKey }: ConstructorInput) {
    this.openai = new OpenAI({
      apiKey,
    });
  }

  async createChatCompletion(input: CreateChatCompletionInput): Promise<ChatCompletion> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: input.messages,
    });

    return {
      content: response.choices[0].message.content ?? '',
    };
  }

  async identifyIntent(input: IdentifyIntentInput): Promise<Intent> {
    const messages = [
      this.buildChatMessage({
        role: 'developer',
        content: `
You are an assistant that analyzes user messages to determine whether the user intends to "save" data to a database or "retrieve" data from it. Based on the user's input, respond **only** with either "save" or "retrieve".

**Instructions:**
- Carefully read the user's message.
- If the user is requesting to retrieve or access data, respond with "retrieve".
- In all other cases, assume the user wants to save the provided information and respond with "save".
- Do not provide any additional text or explanations.

**Examples:**

1. **User:** I would like to add my new address to my profile.
   **Assistant:** save

2. **User:** Can you fetch my recent orders?
   **Assistant:** retrieve

3. **User:** Please store my payment information securely.
   **Assistant:** save

4. **User:** I need to get the list of my favorite movies.
   **Assistant:** retrieve

5. **User:** Update my contact number in the system.
   **Assistant:** save

6. **User:** Show me the details of my last login.
   **Assistant:** retrieve

7. **User:** В Португалии в свободное от работы время можно серфить или записаться в танцевальную школу.
   **Assistant:** save

8. **User:** It's a sunny day today.
   **Assistant:** save

9. **User:** What are the best restaurants nearby?
   **Assistant:** retrieve

10. **User:** I feel like going for a walk.
    **Assistant:** save

11. **User:**  Как ходить в босоногой обуви?
    **Assistant:** retrieve
        `,
      }),
      this.buildChatMessage({
        role: 'user',
        content: input.message,
      }),
    ];

    const completion = await this.createChatCompletion({ messages });

    const intent = completion.content.trim().toLowerCase();

    if (intent.includes('save')) return 'save';

    if (intent.includes('retrieve')) return 'retrieve';

    return 'unknown';
  }

  buildChatMessage(input: BuildChatMessageInput): ChatMessage {
    return {
      role: input.role,
      content: input.content,
    };
  }
}

export default LlmProviderOpenai;
