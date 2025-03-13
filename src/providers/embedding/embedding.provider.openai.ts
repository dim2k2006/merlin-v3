import OpenAI from 'openai';
import { EmbeddingProvider, CreateEmbeddingInput, Embedding } from './embedding.provider';

type ConstructorInput = {
  apiKey: string;
};

class EmbeddingProviderOpenAI implements EmbeddingProvider {
  private openai: OpenAI;

  constructor({ apiKey }: ConstructorInput) {
    this.openai = new OpenAI({
      apiKey,
    });
  }

  async createEmbedding(input: CreateEmbeddingInput): Promise<Embedding> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: input.input,
      encoding_format: 'float',
    });

    const data = response.data[0];

    if (!data) {
      throw new Error('Failed to create embedding.');
    }

    return {
      embedding: data.embedding,
    };
  }
}

export default EmbeddingProviderOpenAI;
