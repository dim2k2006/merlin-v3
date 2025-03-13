import { v4 as uuidV4 } from 'uuid';
import { Memory } from './memory.model';
import { MemoryRepository } from './memory.repository';
import { MemoryService, CreateMemoryInput, FindRelevantMemoriesInput } from './memory.service';
import { LlmProvider } from '../../shared/llm.types';
import { EmbeddingProvider } from '../../shared/embedding.types';

type ConstructorInput = {
  memoryRepository: MemoryRepository;
  embeddingProvider: EmbeddingProvider;
  llmProvider: LlmProvider;
};

class MemoryServiceImpl implements MemoryService {
  private memoryRepository: MemoryRepository;

  private embeddingProvider: EmbeddingProvider;

  private llmProvider: LlmProvider;

  constructor({ memoryRepository, embeddingProvider, llmProvider }: ConstructorInput) {
    this.memoryRepository = memoryRepository;

    this.embeddingProvider = embeddingProvider;

    this.llmProvider = llmProvider;
  }

  async saveMemory(input: CreateMemoryInput): Promise<Memory> {
    const embeddingResponse = await this.embeddingProvider.createEmbedding({ input: input.content });

    const memory = {
      id: input.id ?? uuidV4(),
      userId: input.userId,
      content: input.content,
      embeddingVector: embeddingResponse.embedding,
      createdAt: new Date().toISOString(),
    };

    return this.memoryRepository.saveMemory(memory);
  }

  async findRelevantMemories(input: FindRelevantMemoriesInput): Promise<string> {
    const embeddingResponse = await this.embeddingProvider.createEmbedding({ input: input.content });

    const memories = await this.memoryRepository.findRelevantMemories(
      input.userId,
      embeddingResponse.embedding,
      input.k,
    );

    const messages = [
      this.llmProvider.buildChatMessage({
        role: 'developer',
        content: 'You are a helpful personal assistant. The user has stored the following facts:',
      }),
      ...memories.map((memory) =>
        this.llmProvider.buildChatMessage({
          role: 'developer',
          content: memory.content,
        }),
      ),
      this.llmProvider.buildChatMessage({
        role: 'developer',
        content: 'Use these facts to answer the user’s question accurately.',
      }),
      this.llmProvider.buildChatMessage({
        role: 'developer',
        content: 'If you do not know the answer, simply state that you do not know without adding anything else.',
      }),
      this.llmProvider.buildChatMessage({
        role: 'developer',
        content:
          'Use the same language that user used in the prompt message. Translate matching fact to the required language if needed.',
      }),
      this.llmProvider.buildChatMessage({
        role: 'developer',
        content: `You have ${memories.length} memories available. In your response, please include the number of memories you used to answer the question. Even if you do not know the answer, you should still include this number.`,
      }),
      this.llmProvider.buildChatMessage({
        role: 'user',
        content: input.content,
      }),
    ];

    const llmResponse = await this.llmProvider.createChatCompletion({ messages });

    return llmResponse.content;
  }

  async deleteMemory(memoryId: string): Promise<void> {
    return this.memoryRepository.deleteMemory(memoryId);
  }
}

export default MemoryServiceImpl;
